import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';

import '../data/entitlement_repository.dart';
import '../data/playback_repository.dart';
import '../data/wallet_repository.dart';
import '../degame_app.dart';
import '../models/ticket_entitlement.dart';
import '../models/wallet_models.dart';

class TicketWalletScreen extends StatefulWidget {
  const TicketWalletScreen({
    super.key,
    required this.openWeb,
  });

  final Future<void> Function(String path) openWeb;

  @override
  State<TicketWalletScreen> createState() => _TicketWalletScreenState();
}

class _TicketWalletScreenState extends State<TicketWalletScreen> {
  late final EntitlementRepository entitlementRepository;
  late final WalletRepository walletRepository;
  late final PlaybackRepository playbackRepository;

  EntitlementSnapshot? snapshot;
  List<WalletBalance> balances = const [];
  List<WalletActivity> activity = const [];
  Map<String, dynamic>? tenant;
  bool loading = true;
  String? error;
  String? walletError;
  String? playbackError;
  PlaybackGrant? grant;
  bool authorizing = false;

  final watchCode = TextEditingController();
  final watchEmail = TextEditingController();

  @override
  void initState() {
    super.initState();
    final client = Supabase.instance.client;
    entitlementRepository = EntitlementRepository(client);
    walletRepository = WalletRepository(client);
    playbackRepository = PlaybackRepository(client);
    unawaited(_refresh());
  }

  @override
  void dispose() {
    watchCode.dispose();
    watchEmail.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      loading = true;
      error = null;
      walletError = null;
      playbackError = null;
      grant = null;
    });
    try {
      snapshot = await entitlementRepository.load();
      if (mounted) {
        setState(() => loading = false);
      }
    } catch (exception) {
      if (mounted) {
        setState(() {
          error = exception.toString().replaceFirst('Exception: ', '');
          loading = false;
        });
      }
    }
    try {
      final values = await Future.wait<Object?>([
        walletRepository.balances(),
        walletRepository.activity(limit: 30),
        walletRepository.tenantConfig(),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        balances = values[0] as List<WalletBalance>;
        activity = values[1] as List<WalletActivity>;
        tenant = values[2] as Map<String, dynamic>?;
      });
    } catch (exception) {
      if (mounted) {
        setState(() => walletError =
            exception.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  Future<void> _authorizeLegacy() async {
    final code = watchCode.text.trim();
    final email = watchEmail.text.trim();
    if (code.isEmpty || email.isEmpty) {
      setState(() => playbackError = 'Enter the watch code and ticket email.');
      return;
    }
    await _runPlayback(() => playbackRepository.authorizeScreeningTicket(
          watchCode: code,
          email: email,
        ));
  }

  Future<void> _authorizeLive(TicketEntitlement entitlement, String mode) async {
    final streamId = entitlement.streamId;
    if (streamId == null || streamId.isEmpty) {
      return;
    }
    await _runPlayback(() => playbackRepository.authorizeLivePlayback(
          streamId: streamId,
          mode: mode,
        ));
  }

  Future<void> _runPlayback(Future<PlaybackGrant> Function() authorize) async {
    setState(() {
      authorizing = true;
      playbackError = null;
      grant = null;
    });
    try {
      final result = await authorize();
      if (mounted) {
        setState(() => grant = result);
      }
    } catch (exception) {
      if (mounted) {
        setState(() => playbackError =
            exception.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() => authorizing = false);
      }
    }
  }

  String _date(DateTime? value) {
    if (value == null) {
      return 'Not specified';
    }
    final local = value.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.confirmation_number_outlined, size: 46),
            const SizedBox(height: 12),
            const Text('Sign in to view your tickets and Personal Wallet.'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => showModalBottomSheet(
                isScrollControlled: true,
                context: context,
                builder: (_) => const SignInSheet(),
              ),
              child: const Text('Sign in'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Text(
            'My Tickets & Wallet',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          if (tenant != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                tenant!['name']?.toString() ?? tenant!['slug']?.toString() ?? '',
                style: const TextStyle(color: Colors.white60),
              ),
            ),
          const SizedBox(height: 14),
          _walletCard(),
          const SizedBox(height: 18),
          _entitlementsCard(),
          const SizedBox(height: 18),
          _legacyPlaybackCard(),
          if (grant != null) ...[
            const SizedBox(height: 16),
            SecureVideoPlayer(url: grant!.playbackUrl),
            if (grant!.expiresAt != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Playback grant expires: ${grant!.expiresAt!.toLocal()}',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ),
          ],
          if (playbackError != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(playbackError!, style: const TextStyle(color: Colors.redAccent)),
            ),
          const SizedBox(height: 18),
          OutlinedButton(
            onPressed: () => widget.openWeb('/dashboard?tab=tickets'),
            child: const Text('Open full ticket and viewing dashboard'),
          ),
          OutlinedButton(
            onPressed: () => widget.openWeb('/support'),
            child: const Text('Contact DeGameTV Support'),
          ),
        ],
      ),
    );
  }

  Widget _walletCard() {
    return Card(
      color: panel,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Personal Wallet', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            if (walletError != null)
              Text(walletError!, style: const TextStyle(color: Colors.orangeAccent))
            else if (balances.isEmpty)
              const Text('No wallet balances are available for this account.', style: TextStyle(color: Colors.white60))
            else
              ...balances.map((balance) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(balance.currency),
                    trailing: Text(
                      '${balance.balanceMajor}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  )),
            const Divider(height: 22),
            const Text('Recent wallet activity', style: TextStyle(fontWeight: FontWeight.w600)),
            if (activity.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('No wallet activity is available.', style: TextStyle(color: Colors.white60)),
              )
            else
              ...activity.take(5).map((entry) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(entry.description),
                    subtitle: Text('${entry.status} • ${entry.createdAt?.toLocal() ?? 'Date unavailable'}'),
                    trailing: Text('${entry.currency} ${entry.amountMajor}'),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _entitlementsCard() {
    final current = snapshot;
    return Card(
      color: panel,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ticket entitlements', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            if (loading) const Padding(
              padding: EdgeInsets.all(18),
              child: Center(child: CircularProgressIndicator(color: red)),
            ) else if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(error!, style: const TextStyle(color: Colors.redAccent)),
              )
            else if (current == null || current.entitlements.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 10),
                child: Text('No ticket entitlements are available for this account.', style: TextStyle(color: Colors.white60)),
              )
            else ...[
              if (current.isStale)
                const Padding(
                  padding: EdgeInsets.only(top: 10, bottom: 8),
                  child: Text(
                    'Offline cached entitlements. Playback and checkout require a fresh server authorization.',
                    style: TextStyle(color: Colors.orangeAccent),
                  ),
                ),
              ...current.entitlements.map(_entitlementTile),
            ],
          ],
        ),
      ),
    );
  }

  Widget _entitlementTile(TicketEntitlement entitlement) {
    final active = entitlement.isLocallyActive;
    final isLive = entitlement.sourceType == 'live' && entitlement.streamId != null;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.confirmation_number_outlined,
              color: active ? red : Colors.white38,
              size: 30,
            ),
            title: Text('${entitlement.ticketType} • ${entitlement.sourceType}'),
            subtitle: Text(
              '${entitlement.entitlementStatus} • Valid until ${_date(entitlement.validUntil)}'
              '${entitlement.currency == null ? '' : ' • ${entitlement.currency} ${entitlement.price ?? ''}'}',
            ),
            trailing: Chip(label: Text(active ? 'Active' : entitlement.entitlementStatus)),
          ),
          if (isLive)
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: !active || snapshot?.isStale == true || authorizing
                      ? null
                      : () => _authorizeLive(entitlement, 'live'),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Watch live'),
                ),
                OutlinedButton.icon(
                  onPressed: !active || snapshot?.isStale == true || authorizing
                      ? null
                      : () => _authorizeLive(entitlement, 'replay'),
                  icon: const Icon(Icons.replay),
                  label: const Text('Watch replay'),
                ),
              ],
            )
          else
            Text(
              'Ticket code: ${entitlement.ticketCode ?? 'Not available'}',
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
        ],
      ),
    );
  }

  Widget _legacyPlaybackCard() {
    return Card(
      color: panel,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Screening watch code', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text(
              'Validate the watch code and ticket email first. A short-lived provider playback grant is then requested online; cached tickets never authorize offline playback.',
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: watchCode,
              decoration: const InputDecoration(labelText: 'Watch code'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: watchEmail,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Ticket email'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: authorizing ? null : _authorizeLegacy,
                child: Text(authorizing ? 'Verifying ticket…' : 'Verify & watch'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SecureVideoPlayer extends StatefulWidget {
  const SecureVideoPlayer({
    super.key,
    required this.url,
  });

  final Uri url;

  @override
  State<SecureVideoPlayer> createState() => _SecureVideoPlayerState();
}

class _SecureVideoPlayerState extends State<SecureVideoPlayer> {
  late final VideoPlayerController controller;
  late final Future<void> initialized;

  @override
  void initState() {
    super.initState();
    controller = VideoPlayerController.networkUrl(widget.url);
    initialized = controller.initialize().then((_) {
      unawaited(controller.setLooping(false));
      unawaited(controller.play());
    });
  }

  @override
  void dispose() {
    unawaited(controller.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
        future: initialized,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const AspectRatio(
              aspectRatio: 16 / 9,
              child: Center(child: CircularProgressIndicator(color: red)),
            );
          }
          if (snapshot.hasError) {
            return const Text('Secure video could not be opened on this device.');
          }
          return Column(
            children: [
              AspectRatio(
                aspectRatio: controller.value.aspectRatio,
                child: VideoPlayer(controller),
              ),
              VideoProgressIndicator(
                controller,
                allowScrubbing: true,
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: () {
                      if (controller.value.isPlaying) {
                        unawaited(controller.pause());
                      } else {
                        unawaited(controller.play());
                      }
                      setState(() {});
                    },
                    icon: Icon(controller.value.isPlaying ? Icons.pause : Icons.play_arrow),
                  ),
                  Text(
                    '${controller.value.position.inMinutes.toString().padLeft(2, '0')}:'
                    '${(controller.value.position.inSeconds % 60).toString().padLeft(2, '0')}',
                  ),
                ],
              ),
            ],
          );
        },
      );
}