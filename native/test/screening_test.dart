import 'package:flutter_test/flutter_test.dart';
import 'package:degametv_native/models/screening.dart';
void main() {
  test('maps a published screening into the native catalogue model', () {
    final item = Screening.fromJson(
      {
        'id': 'screening-1',
        'title': 'Test premiere',
        'slug': 'test-premiere',
        'screening_date': '2027-02-14T18:00:00Z',
        'event_type': 'film',
        'location_pricing': {'nigeria': 5000},
      },
      countryCode: 'NG',
    );
    expect(item.id, 'screening-1');
    expect(item.title, 'Test premiere');
    expect(item.price, 5000);
    expect(item.eventType, 'film');
  });
}