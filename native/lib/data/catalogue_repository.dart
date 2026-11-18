import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/screening.dart';
class CatalogueRepository {
  CatalogueRepository(this.client);
  final SupabaseClient client;
  Future<List<Screening>> publishedScreenings() async {
    final rows = await client.from('screenings').select('id,title,slug,description,poster_url,banner_url,screening_date,event_type,location_pricing').eq('status', 'published').order('screening_date', ascending: true);
    return rows.map((row) => Screening.fromJson(row)).toList(growable: false);
  }
  RealtimeChannel subscribe(void Function() refresh) => client.channel('degame-native-catalogue').onPostgresChanges(event: PostgresChangeEvent.all, schema: 'public', table: 'screenings', callback: (_) => refresh()).subscribe();
}
