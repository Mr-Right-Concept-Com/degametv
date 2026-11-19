// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import '../data/catalogue_repository.dart';
import '../degame_app.dart';
import '../models/screening.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final CatalogueRepository repo;
  RealtimeChannel? subscription;
  StreamSubscription<AuthState>? authSubscription;
  List<Screening> items = [];
  bool loading = true;
  String? error;
  String? webAppUrl;
  int tab = 0;

  @override
  void initState() {
    super.initState();
    repo = CatalogueRepository(Supabase.instance.client);
    load();
    subscription = repo.subscribe(load);
    authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    authSubscription?.cancel();
    if (subscription != null) { Supabase.instance.client.removeChannel(subscription!); }
    super.dispose();
  }

  Future<void> load() async {
    try {
      final config = await repo.runtimeConfig();
      final geo = config['geo'] is Map ? Map<String, dynamic>.from(config['geo'] as Map) : <String, dynamic>{};
      final countryCode = geo['countryCode']?.toString();
      final configuredWebUrl = config['webAppUrl']?.toString();
      final result = await repo.publishedScreenings(countryCode: countryCode);
      if (mounted) setState(() {
        items = result;
        webAppUrl = configuredWebUrl != null && configuredWebUrl.startsWith('https://') ? configuredWebUrl : null;
        loading = false;
        error = null;
      });
    } catch (_) {
      if (mounted) { setState(() { loading = false; error = 'Catalogue unavailable. Pull down to retry.'; }); }
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    const labels = ['Home', 'Cinema', 'Live', 'My Tickets'];
    const icons = [Icons.home_outlined, Icons.movie_outlined, Icons.podcasts_outlined, Icons.confirmation_number_outlined];
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
                setState(() => tab = 3);
              } else if (value == 'dashboard') {
                await _openWeb('/dashboard');
              } else if (value == 'studio') {
                await _openWeb('/studio');
              }
            },
            itemBuilder: (context) {
              final signedIn = Supabase.instance.client.auth.currentUser != null;
              return [
                if (!signedIn) const PopupMenuItem(value: 'signin', child: Text('Sign in / Create account')),
                if (signedIn) const PopupMenuItem(value: 'dashboard', child: Text('My Dashboard')),
                if (signedIn) const PopupMenuItem(value: 'tickets', child: Text('My Tickets')),
                if (signedIn) const PopupMenuItem(value: 'studio', child: Text('Creator Studio')),
                if (signedIn) const PopupMenuItem(value: 'signout', child: Text('Sign out')),
              ];
            },
          ),
        ],
      ),
      body: Row(children: [
        if (wide) NavigationRail(
          selectedIndex: tab,
          onDestinationSelected: (v) => setState(() => tab = v),
          labelType: NavigationRailLabelType.all,
          destinations: List.generate(labels.length, (i) => NavigationRailDestination(icon: Icon(icons[i]), label: Text(labels[i]))),
        ),
        Expanded(child: tab == 3 ? _tickets() : _catalogue()),
      ]),
      bottomNavigationBar: wide ? null : NavigationBar(
        backgroundColor: panel,
        selectedIndex: tab,
        onDestinationSelected: (v) => setState(() => tab = v),
        destinations: List.generate(labels.length, (i) => NavigationDestination(icon: Icon(icons[i]), label: labels[i])),
      ),
    );
  }

  Widget _catalogue() {
    if (loading) { return const Center(child: CircularProgressIndicator(color: red)); }
    if (error != null) { return Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [Text(error!), const SizedBox(height: 12), FilledButton(onPressed: load, child: const Text('Retry'))],
    )); }
    if (tab == 2) {
      final live = items.where((e) => e.eventType == 'live').toList();
      return _listing(live, 'Live experiences');
    }
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          if (items.isNotEmpty) _hero(items.first),
          const SizedBox(height: 26),
          Text(tab == 1 ? 'Cinema catalogue' : 'Premieres & screenings',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          _grid(items),
        ],
      ),
    );
  }

  Widget _listing(List<Screening> list, String title) => RefreshIndicator(
    onRefresh: load,
    child: ListView(padding: const EdgeInsets.all(18), children: [
      Text(title, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 16),
      _grid(list),
    ]),
  );

  Widget _hero(Screening s) => Container(
    height: 290,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(26),
      image: (s.bannerUrl ?? s.posterUrl) == null ? null : DecorationImage(
        image: CachedNetworkImageProvider(s.bannerUrl ?? s.posterUrl!),
        fit: BoxFit.cover,
        colorFilter: const ColorFilter.mode(Color(0x99000000), BlendMode.darken),
      ),
      gradient: const LinearGradient(colors: [Color(0xFF401010), black]),
    ),
    padding: const EdgeInsets.all(24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        const Chip(label: Text('FEATURED ON DEGAMETV'), backgroundColor: red),
        Text(s.title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
        if ((s.description ?? '').isNotEmpty) Text(s.description!, maxLines: 2, overflow: TextOverflow.ellipsis),
        if (s.price != null) Text('From ${s.currency} ${s.price!.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),
        FilledButton(onPressed: () => _openWeb('/movie/${Uri.encodeComponent(s.slug)}'), child: const Text('Explore premiere')),
      ],
    ),
  );

  Widget _grid(List<Screening> list) => LayoutBuilder(builder: (context, box) {
    final columns = box.maxWidth > 1000 ? 4 : box.maxWidth > 620 ? 3 : 2;
    if (list.isEmpty) { return const Padding(
      padding: EdgeInsets.all(24),
      child: Center(child: Text('New experiences are coming soon.')),
    ); }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: list.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns, crossAxisSpacing: 14, mainAxisSpacing: 14, childAspectRatio: .64,
      ),
      itemBuilder: (_, i) {
        final s = list[i];
        return InkWell(
          onTap: () => _openWeb('/movie/${Uri.encodeComponent(s.slug)}'),
          borderRadius: BorderRadius.circular(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: SizedBox.expand(
                child: s.posterUrl == null
                  ? Container(color: panel, child: const Icon(Icons.movie_outlined, size: 38))
                  : CachedNetworkImage(
                      imageUrl: s.posterUrl!, fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(color: panel, child: const Icon(Icons.movie_outlined)),
                    ),
              ),
            )),
            const SizedBox(height: 8),
            Text(s.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(s.eventType ?? 'Cinema', style: const TextStyle(color: Colors.white60, fontSize: 12)),
          ]),
        );
      },
    );
  });

  Future<void> _openWeb(String path) async {
    final base = webAppUrl;
    if (base == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The canonical DeGameTV web URL has not been published by an administrator yet.')),
      );
      return;
    }
    final uri = Uri.parse(base).resolve(path);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _tickets() {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) { return Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.confirmation_number_outlined, size: 46),
        const SizedBox(height: 12),
        const Text('Sign in to access your tickets.'),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () => showModalBottomSheet(
            isScrollControlled: true, context: context, builder: (_) => const SignInSheet(),
          ),
          child: const Text('Sign in'),
        ),
      ],
    )); }
    return _TicketWallet(userId: user.id, openWeb: _openWeb);
  }
}

class _TicketWallet extends StatefulWidget {
  const _TicketWallet({required this.userId, required this.openWeb});
  final String userId;
  final Future<void> Function(String) openWeb;
  @override State<_TicketWallet> createState() => _TicketWalletState();
}

class _TicketWalletState extends State<_TicketWallet> {
  late Future<List<Map<String, dynamic>>> tickets;
  final watchCode = TextEditingController();
  final watchEmail = TextEditingController();
  bool authorizing = false;
  String? playbackError;
  String? playbackUrl;
  String? playbackExpiresAt;

  @override
  void dispose() {
    watchCode.dispose();
    watchEmail.dispose();
    super.dispose();
  }

  Future<void> _authorizePlayback() async {
    FocusScope.of(context).unfocus();
    setState(() { authorizing = true; playbackError = null; playbackUrl = null; });
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'get-playback-url',
        body: {'watchCode': watchCode.text.trim(), 'email': watchEmail.text.trim()},
      );
      final data = response.data;
      if (response.status != 200 || data is! Map || data['success'] != true || data['playbackUrl'] is! String) {
        throw Exception(data is Map ? (data['error']?.toString() ?? 'Playback could not be authorized.') : 'Playback could not be authorized.');
      }
      setState(() {
        playbackUrl = data['playbackUrl'] as String;
        playbackExpiresAt = data['expiresAt']?.toString();
      });
    } catch (e) {
      setState(() => playbackError = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) { setState(() => authorizing = false); }
    }
  }
  @override
  void initState() { super.initState(); tickets = _load(); }
  Future<List<Map<String, dynamic>>> _load() async {
    final rows = await Supabase.instance.client
      .from('tickets')
      .select('id,ticket_type,price,currency,valid_from,valid_until,is_used,created_at,revoked_at')
      .eq('user_id', widget.userId)
      .isFilter('revoked_at', null)
      .order('created_at', ascending: false);
    return rows;
  }
  String _date(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '');
    if (date == null) { return '—'; }
    return '${date.toLocal().day}/${date.toLocal().month}/${date.toLocal().year}';
  }
  @override
  Widget build(BuildContext context) => FutureBuilder<List<Map<String, dynamic>>>(
    future: tickets,
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting) { return const Center(child: CircularProgressIndicator(color: red)); }
      if (snapshot.hasError) { return Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('We could not load your tickets.'),
          const SizedBox(height: 10),
          FilledButton(onPressed: () => setState(() => tickets = _load()), child: const Text('Try again')),
        ]),
      )); }
      final data = snapshot.data ?? [];
      return RefreshIndicator(
        onRefresh: () async => setState(() => tickets = _load()),
        child: ListView(padding: const EdgeInsets.all(18), children: [
          Text('My Tickets', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('${data.length} ticket(s)', style: const TextStyle(color: Colors.white60)),
          const SizedBox(height: 16),
          Card(
            color: panel,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Watch with a ticket', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                const SizedBox(height: 6),
                const Text('Enter the watch code and email from your ticket confirmation. Playback is issued only after the secure delivery service verifies your entitlement.', style: TextStyle(color: Colors.white60, fontSize: 12)),
                const SizedBox(height: 12),
                TextField(controller: watchCode, decoration: const InputDecoration(labelText: 'Watch code')),
                const SizedBox(height: 10),
                TextField(controller: watchEmail, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Ticket email')),
                if (playbackError != null) Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(playbackError!, style: const TextStyle(color: Colors.redAccent)),
                ),
                const SizedBox(height: 12),
                SizedBox(width: double.infinity, child: FilledButton(
                  onPressed: authorizing ? null : _authorizePlayback,
                  child: Text(authorizing ? 'Verifying ticket…' : 'Verify & watch'),
                )),
                if (playbackUrl != null) ...[
                  const SizedBox(height: 14),
                  if (Theme.of(context).platform == TargetPlatform.windows || Theme.of(context).platform == TargetPlatform.linux)
                    OutlinedButton(
                      onPressed: () => widget.openWeb(playbackUrl!),
                      child: const Text('Open secure stream in browser'),
                    )
                  else
                    SecureVideoPlayer(url: playbackUrl!),
                  if (playbackExpiresAt != null) Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Secure playback grant expires: $playbackExpiresAt', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                  ),
                ],
              ]),
            ),
          ),
          const SizedBox(height: 16),
          if (data.isEmpty) const Padding(
            padding: EdgeInsets.all(30),
            child: Center(child: Text('Your tickets will appear here after a successful purchase.')),
          ),
          ...data.map((ticket) {
            final used = ticket['is_used'] == true;
            final revoked = ticket['revoked_at'] != null;
            final status = revoked ? 'Revoked' : used ? 'Used' : 'Ready';
            final currency = ticket['currency']?.toString() ?? 'NGN';
            final amount = ticket['price']?.toString() ?? '0';
            return Card(
              color: panel,
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: Icon(Icons.confirmation_number_outlined, color: used ? Colors.white54 : red, size: 30),
                title: Text('${ticket['ticket_type'] ?? 'Cinema'} ticket'),
                subtitle: Text('$currency $amount • Valid from ${_date(ticket['valid_from'])} to ${_date(ticket['valid_until'])}'),
                trailing: Chip(label: Text(status)),
              ),
            );
          }),
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: () => widget.openWeb('/dashboard?tab=tickets'),
            child: const Text('Open full ticket and viewing dashboard'),
          ),
        ]),
      );
    },
  );
}


class SecureVideoPlayer extends StatefulWidget {
  const SecureVideoPlayer({super.key, required this.url});
  final String url;
  @override State<SecureVideoPlayer> createState() => _SecureVideoPlayerState();
}

class _SecureVideoPlayerState extends State<SecureVideoPlayer> {
  late final VideoPlayerController controller;
  late final Future<void> initialized;

  @override
  void initState() {
    super.initState();
    controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    initialized = controller.initialize().then((_) {
      controller.setLooping(false);
      controller.play();
    });
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: initialized,
    builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.waiting) {
        return const AspectRatio(aspectRatio: 16 / 9, child: Center(child: CircularProgressIndicator(color: red)));
      }
      if (snapshot.hasError) {
        return const Text('Secure video could not be opened on this device.');
      }
      return Column(children: [
        AspectRatio(aspectRatio: controller.value.aspectRatio, child: VideoPlayer(controller)),
        VideoProgressIndicator(controller, allowScrubbing: true, padding: const EdgeInsets.symmetric(vertical: 10)),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          IconButton(onPressed: () => setState(() => controller.value.isPlaying ? controller.pause() : controller.play()), icon: Icon(controller.value.isPlaying ? Icons.pause : Icons.play_arrow)),
          Text('${(controller.value.position.inMinutes).toString().padLeft(2, '0')}:${(controller.value.position.inSeconds % 60).toString().padLeft(2, '0')}'),
        ]),
      ]);
    },
  );
}
