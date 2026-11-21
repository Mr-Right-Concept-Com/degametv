import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/wallet_models.dart';

class PlaybackRepository {
  PlaybackRepository(this.client);

  final SupabaseClient client;

  Future<Map<String, dynamic>> validateWatchCode({
    required String watchCode,
    required String email,
  }) async {
    final response = await client.functions.invoke(
      'validate-watch-code',
      body: {
        'watchCode': watchCode.trim(),
        'email': email.trim().toLowerCase(),
      },
    );
    final data = response.data;
    if (response.status != 200 || data is! Map || data['success'] != true) {
      throw StateError(
        data is Map
            ? data['error']?.toString() ?? 'Ticket validation failed.'
            : 'Ticket validation failed.',
      );
    }
    final ticket = data['ticket'];
    if (ticket is! Map) {
      throw const FormatException('Ticket response is invalid.');
    }
    return Map<String, dynamic>.from(ticket);
  }

  Future<PlaybackGrant> authorizeScreeningTicket({
    required String watchCode,
    required String email,
  }) async {
    await validateWatchCode(watchCode: watchCode, email: email);
    final sessionId = _newUuidV4();
    final response = await client.functions.invoke(
      'get-playback-url',
      body: {
        'watchCode': watchCode.trim(),
        'email': email.trim().toLowerCase(),
        'sessionId': sessionId,
      },
    );
    final data = response.data;
    if (response.status != 200 || data is! Map) {
      throw StateError(
        data is Map
            ? data['error']?.toString() ?? 'Playback could not be authorized.'
            : 'Playback could not be authorized.',
      );
    }
    return PlaybackGrant.fromResponse(Map<String, dynamic>.from(data));
  }

  Future<PlaybackGrant> authorizeLivePlayback({
    required String streamId,
    required String mode,
  }) async {
    if (client.auth.currentUser == null) {
      throw StateError('Sign in to verify your live-event entitlement.');
    }
    if (mode != 'live' && mode != 'replay') {
      throw ArgumentError.value(mode, 'mode', 'Use live or replay.');
    }
    final response = await client.functions.invoke(
      'authorize-live-playback',
      body: {'streamId': streamId, 'mode': mode},
    );
    final data = response.data;
    if (response.status != 200 || data is! Map) {
      throw StateError(
        data is Map
            ? data['error']?.toString() ?? 'Playback could not be authorized.'
            : 'Playback could not be authorized.',
      );
    }
    return PlaybackGrant.fromResponse(Map<String, dynamic>.from(data));
  }

  String _newUuidV4() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
        '${hex.substring(20)}';
  }
}