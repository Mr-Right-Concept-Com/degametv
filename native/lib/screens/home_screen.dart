import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:material_ui/material_ui.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/catalogue_repository.dart';
import '../data/entitlement_repository.dart';
import '../degame_app.dart';
import '../models/screening.dart';
import '../routing/deep_link_router.dart';
import 'screening_purchase_sheet.dart';
import 'ticket_wallet_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  late final CatalogueRepository repository;
  late final AppLinks appLinks;
  RealtimeChannel? subscription;
  StreamSubscription<AuthState>? authSubscription;
  StreamSubscription<Uri>? deepLinkSubscription;

  List<Screening> items = const [];
  bool loading = true;
  String? error;
  String? webAppUrl;
  String? countryCode;
  String? currencyCode;
  int tab = 0;
  int refreshEpoch = 0;
  String? lastUserId;
  Uri? pendingDeepLink;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    repository = CatalogueRepository(Supabase.instance.client);
    appLinks = AppLinks();
    lastUserId = Supabase.instance.client.auth.currentUser?.id;
    unawaited(_listenForDeepLinks());
    unawaited(load());
    subscription = repository.subscribe(() => unawaited(load()));
    authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      final currentUserId = Supabase.instance.client.auth.currentUser?.id;
      if (lastUserId != null && currentUserId != lastUserId) {
        unawaited(EntitlementRepository(Supabase.instance.client)
            .clearForSignedOutUser(lastUserId!));
      }
      lastUserId = currentUserId;
      if (mounted) {
        setState(() => refreshEpoch++);
      }
    });
  }

  Future<void> _listenForDeepLinks() async {
    deepLinkSubscription = appLinks.uriLinkStream.listen(
      _handleDeepLink,
      onError: (_) {},
    );
    try {
      final initial = await appLinks.getInitialLink();
      if (initial != null) {
        _handleDeepLink(initial);
      }
    } catch (_) {
      // Initial-link lookup is optional; stream delivery remains active.
    }
  }

  void _handleDeepLink(Uri uri) {
    if (uri.scheme == 'https' && webAppUrl == null) {
      pendingDeepLink = uri;
      return;
    }
    final host = Uri.tryParse(webAppUrl ?? '')?.host;
    final destination = DeepLinkRouter.destinationFor(
      uri,
      canonicalWebHost: host,
    );
    if (destination == null || !mounted) {
      return;
    }

    switch (destination) {
      case NativeDestination.tickets:
      case NativeDestination.playback:
      case NativeDestination.checkoutReturn:
        setState(() {
          tab = 3;
          refreshEpoch++;
        });
        return;
      case NativeDestination.support:
        unawaited(_openWeb('/support'));
        return;
      case NativeDestination.studio:
        unawaited(_openWeb('/studio'));
        return;
      case NativeDestination.dashboard:
        unawaited(_openWeb('/dashboard'));
        return;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      setState(() => refreshEpoch++);
      unawaited(load());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (authSubscription != null) {
      unawaited(authSubscription!.cancel());
    }
    if (deepLinkSubscription != null) {
      unawaited(deepLinkSubscription!.cancel());
    }
    if (subscription != null) {
      unawaited(Supabase.instance.client.removeChannel(subscription!).then((_) {}));
    }
    super.dispose();
  }

  Future<void> load() async {
    try {
      final config = await repository.runtimeConfig();
      final geo = config['geo'] is Map
          ? Map<String, dynamic>.from(config['geo'] as Map)
          : <String, dynamic>{};
      final resolvedCountry = geo['countryCode']?.toString().toUpperCase();
      final configuredCurrency = config['currency']?.toString().toUpperCase();
      final resolvedCurrency = configuredCurrency != null &&
              RegExp(r'^[A-Z]{3}$').hasMatch(configuredCurrency)
          ? configuredCurrency
          : null;
      final configuredWebUrl = config['webAppUrl']?.toString();
      final result = await repository.publishedScreenings(
        countryCode: resolvedCountry,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        items = result;
        countryCode = resolvedCountry;
        currencyCode = resolvedCurrency;
        webAppUrl = configuredWebUrl != null &&
                Uri.tryParse(configuredWebUrl)?.scheme == 'https'
            ? configuredWebUrl
            : null;
        loading = false;
        error = null;
      });
      final pending = pendingDeepLink;
      pendingDeepLink = null;
      if (pending != null) {
        _handleDeepLink(pending);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          loading = false;
          error = 'Catalogue unavailable. Pull down to retry.';
        });
      }
    }
  }

  Future<void> _openWeb(String path) async {
    final base = webAppUrl;
    if (base == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('The canonical DeGameTV web URL has not been published by an administrator yet.'),
          ),
        );
      }
      return;
    }
    final uri = Uri.parse(base).resolve(path);
    if (uri.scheme != 'https' || uri.host != Uri.parse(base).host) {
      throw StateError('The requested destination is outside the published DeGameTV domain.');
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _showScreening(Screening screening) async {
    final completed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ScreeningPurchaseSheet(
        screening: screening,
        countryCode: countryCode,
        currencyCode: currencyCode,
        openWeb: _openWeb,
      ),
    );
    if (completed == true && mounted) {
      setState(() => refreshEpoch++);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Checkout started or completed. Your ticket wallet is refreshing.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    const labels = ['Home', 'Cinema', 'Live', 'My Tickets'];
    const icons = [
      Icons.home_outlined,
      Icons.movie_outlined,
      Icons.podcasts_outlined,
      Icons.confirmation_number_outlined,
    ];

    return Scaffold(
      appBar: AppBar(
        title: const BrandMark(),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Account and services',
            icon: const Icon(Icons.person_outline),
            onSelected: (value) async {
              if (value == 'signin') {
                await showModalBottomSheet(
                  isScrollControlled: true,
                  context: context,
                  builder: (_) => const SignInSheet(),
                );
              } else if (value == 'signout') {
                await Supabase.instance.client.auth.signOut();
              } else if (value == 'tickets') {
                setState(() {
                  tab = 3;
                  refreshEpoch++;
                });
              } else if (value == 'dashboard') {
                await _openWeb('/dashboard');
              } else if (value == 'studio') {
                await _openWeb('/studio');
              } else if (value == 'support') {
                await _openWeb('/support');
              } else if (value == 'notifications') {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Push registration is not enabled: Firebase/APNs credentials and a backend device-token registration contract are not configured.'),
                  ),
                );
              }
            },
            itemBuilder: (context) {
              final signedIn = Supabase.instance.client.auth.currentUser != null;
              return [
                if (!signedIn)
                  const PopupMenuItem(
                    value: 'signin',
                    child: Text('Sign in / Create account'),
                  ),
                if (signedIn)
                  const PopupMenuItem(value: 'dashboard', child: Text('My Dashboard')),
                if (signedIn)
                  const PopupMenuItem(value: 'tickets', child: Text('My Tickets & Wallet')),
                if (signedIn)
                  const PopupMenuItem(value: 'studio', child: Text('Creator Studio')),
                const PopupMenuItem(value: 'support', child: Text('Support Centre')),
                const PopupMenuItem(
                  value: 'notifications',
                  child: Text('Notifications — not configured'),
                ),
                if (signedIn)
                  const PopupMenuItem(value: 'signout', child: Text('Sign out')),
              ];
            },
          ),
        ],
      ),
      body: Row(
        children: [
          if (wide)
            NavigationRail(
              selectedIndex: tab,
              onDestinationSelected: (value) => setState(() => tab = value),
              labelType: NavigationRailLabelType.all,
              destinations: List.generate(
                labels.length,
                (index) => NavigationRailDestination(
                  icon: Icon(icons[index]),
                  label: Text(labels[index]),
                ),
              ),
            ),
          Expanded(
            child: tab == 3
                ? TicketWalletScreen(
                    key: ValueKey(refreshEpoch),
                    openWeb: _openWeb,
                  )
                : _catalogue(),
          ),
        ],
      ),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              backgroundColor: panel,
              selectedIndex: tab,
              onDestinationSelected: (value) => setState(() => tab = value),
              destinations: List.generate(
                labels.length,
                (index) => NavigationDestination(
                  icon: Icon(icons[index]),
                  label: labels[index],
                ),
              ),
            ),
    );
  }

  Widget _catalogue() {
    if (loading) {
      return const Center(child: CircularProgressIndicator(color: red));
    }
    if (error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(error!),
            const SizedBox(height: 12),
            FilledButton(onPressed: load, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (tab == 2) {
      final live = items.where((item) => item.eventType == 'live').toList();
      return _listing(live, 'Live experiences');
    }

    final cinema = items.where((item) => item.eventType != 'live').toList();
    final displayed = tab == 1 ? cinema : items;
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          if (displayed.isNotEmpty) _hero(displayed.first),
          const SizedBox(height: 26),
          Text(
            tab == 1 ? 'Cinema catalogue' : 'Premieres & screenings',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 14),
          _grid(displayed),
        ],
      ),
    );
  }

  Widget _listing(List<Screening> list, String title) => RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Text(title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            _grid(list),
          ],
        ),
      );

  Widget _hero(Screening screening) => Container(
        height: 290,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(26),
          image: (screening.bannerUrl ?? screening.posterUrl) == null
              ? null
              : DecorationImage(
                  image: CachedNetworkImageProvider(
                    screening.bannerUrl ?? screening.posterUrl!,
                  ),
                  fit: BoxFit.cover,
                  colorFilter: const ColorFilter.mode(
                    Color(0x99000000),
                    BlendMode.darken,
                  ),
                ),
          gradient: const LinearGradient(colors: [Color(0xFF401010), black]),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            const Chip(
              label: Text('FEATURED ON DEGAMETV'),
              backgroundColor: red,
            ),
            Text(
              screening.title,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            if ((screening.description ?? '').isNotEmpty)
              Text(
                screening.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            if (screening.price != null)
              Text(
                'From ${screening.currency} ${screening.price!.toStringAsFixed(2)}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => _showScreening(screening),
              child: const Text('Explore & get access'),
            ),
          ],
        ),
      );

  Widget _grid(List<Screening> list) => LayoutBuilder(
        builder: (context, box) {
          final columns = box.maxWidth > 1000
              ? 4
              : box.maxWidth > 620
                  ? 3
                  : 2;
          if (list.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('New experiences are coming soon.')),
            );
          }
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: list.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              childAspectRatio: .64,
            ),
            itemBuilder: (_, index) {
              final screening = list[index];
              return InkWell(
                onTap: () => _showScreening(screening),
                borderRadius: BorderRadius.circular(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: SizedBox.expand(
                          child: screening.posterUrl == null
                              ? Container(
                                  color: panel,
                                  child: const Icon(Icons.movie_outlined, size: 38),
                                )
                              : CachedNetworkImage(
                                  imageUrl: screening.posterUrl!,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Container(
                                    color: panel,
                                    child: const Icon(Icons.movie_outlined),
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      screening.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      screening.eventType ?? 'Cinema',
                      style: const TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
}