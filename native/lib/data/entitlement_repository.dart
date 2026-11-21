import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/ticket_entitlement.dart';

abstract interface class SecureCacheStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class FlutterSecureCacheStore implements SecureCacheStore {
  FlutterSecureCacheStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class EntitlementSnapshot {
  const EntitlementSnapshot({
    required this.entitlements,
    required this.fetchedAt,
    required this.isStale,
  });

  final List<TicketEntitlement> entitlements;
  final DateTime? fetchedAt;
  final bool isStale;

  factory EntitlementSnapshot.fromCache(String value) {
    final decoded = jsonDecode(value);
    if (decoded is! Map) {
      throw const FormatException('Invalid entitlement cache.');
    }
    final data = Map<String, dynamic>.from(decoded);
    final rows = data['entitlements'];
    if (rows is! List) {
      throw const FormatException('Invalid entitlement rows.');
    }
    return EntitlementSnapshot(
      entitlements: rows
          .whereType<Map>()
          .map((row) => TicketEntitlement.fromJson(Map<String, dynamic>.from(row)))
          .toList(growable: false),
      fetchedAt: DateTime.tryParse(data['fetched_at']?.toString() ?? ''),
      isStale: true,
    );
  }

  String toCacheJson() => jsonEncode({
        'fetched_at': fetchedAt?.toIso8601String(),
        'entitlements': entitlements.map((item) => item.toJson()).toList(),
      });
}

class EntitlementRepository {
  EntitlementRepository(
    this.client, {
    SecureCacheStore? cache,
  }) : _cache = cache ?? FlutterSecureCacheStore();

  final SupabaseClient client;
  final SecureCacheStore _cache;

  String _cacheKey(String userId) => 'degame.entitlements.$userId';

  Future<EntitlementSnapshot> load() async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const EntitlementSnapshot(
        entitlements: [],
        fetchedAt: null,
        isStale: false,
      );
    }

    try {
      final rows = await client
          .from('user_ticket_entitlements')
          .select(
            'entitlement_id,source_type,user_id,screening_id,stream_id,ticket_type,'
            'ticket_code,email,currency,price,payment_status,payment_reference,'
            'purchased_at,valid_until,revoked_at,entitlement_status,is_active',
          )
          .order('purchased_at', ascending: false)
          .limit(100);
      final entitlements = rows
          .map((row) => TicketEntitlement.fromJson(row))
          .toList(growable: false);
      final snapshot = EntitlementSnapshot(
        entitlements: entitlements,
        fetchedAt: DateTime.now().toUtc(),
        isStale: false,
      );
      try {
        await _cache.write(_cacheKey(user.id), snapshot.toCacheJson());
      } catch (_) {
        // A secure-storage outage must not discard a successful live entitlement read.
      }
      return snapshot;
    } catch (_) {
      final cached = await _cache.read(_cacheKey(user.id));
      if (cached == null) {
        rethrow;
      }
      return EntitlementSnapshot.fromCache(cached);
    }
  }

  Future<void> clearForSignedOutUser(String userId) =>
      _cache.delete(_cacheKey(userId));
}