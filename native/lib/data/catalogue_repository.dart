import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/screening.dart';

class CatalogueRepository {
  CatalogueRepository(this.client);
  final SupabaseClient client;

  Future<Map<String, dynamic>> runtimeConfig() async {
    try {
      final response = await client.functions.invoke(
        'runtime-config',
        body: {'visitorId': 'native-client'},
      );
      if (response.data is Map) { return Map<String, dynamic>.from(response.data as Map); }
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
    return rows.map((row) => Screening.fromJson(row, countryCode: countryCode)).toList(growable: false);
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
}
