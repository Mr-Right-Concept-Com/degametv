import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/screening.dart';

class CatalogueRepository {
  CatalogueRepository(this.client);

  final SupabaseClient client;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> runtimeConfig() async {
    try {
      String? visitorId;
      try {
        visitorId = await _storage.read(key: 'degame.native.visitor_id');
        if (visitorId == null) {
          visitorId = _newUuidV4();
          await _storage.write(key: 'degame.native.visitor_id', value: visitorId);
        }
      } catch (_) {
        visitorId = null;
      }
      final response = await client.functions.invoke(
        'runtime-config',
        body: visitorId == null ? const {} : {'visitorId': visitorId},
      );
      if (response.data is Map) {
        return Map<String, dynamic>.from(response.data as Map);
      }
    } catch (_) {
      // Catalogue remains usable when optional runtime preferences are unavailable.
    }
    return <String, dynamic>{};
  }

  Future<List<Screening>> publishedScreenings({String? countryCode}) async {
    final rows = await client
        .from('screenings')
        .select('id,title,slug,description,poster_url,banner_url,screening_date,event_type,location_pricing')
        .eq('status', 'published')
        .order('screening_date', ascending: true)
        .limit(60);
    return rows
        .map((row) => Screening.fromJson(row, countryCode: countryCode))
        .toList(growable: false);
  }

  RealtimeChannel subscribe(void Function() refresh) => client
      .channel('degame-native-catalogue')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'screenings',
        callback: (_) => refresh(),
      )
      .subscribe();

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
