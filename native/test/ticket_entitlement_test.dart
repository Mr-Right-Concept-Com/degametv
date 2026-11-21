import 'package:degametv_native/models/ticket_entitlement.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a live ticket entitlement from the backend view', () {
    final entitlement = TicketEntitlement.fromJson({
      'entitlement_id': 'entitlement-1',
      'source_type': 'live',
      'screening_id': 'screening-1',
      'stream_id': 'stream-1',
      'ticket_type': 'combo',
      'ticket_code': 'DTV-123',
      'entitlement_status': 'active',
      'is_active': true,
      'currency': 'NGN',
      'price': '5000.00',
      'valid_until': '2099-01-01T00:00:00Z',
    });

    expect(entitlement.entitlementId, 'entitlement-1');
    expect(entitlement.streamId, 'stream-1');
    expect(entitlement.ticketType, 'combo');
    expect(entitlement.price, 5000);
    expect(entitlement.isLocallyActive, isTrue);
  });

  test('locally expires a cached entitlement without granting playback', () {
    final entitlement = TicketEntitlement.fromJson({
      'entitlement_id': 'entitlement-2',
      'source_type': 'screening',
      'ticket_type': 'cinema',
      'entitlement_status': 'active',
      'is_active': true,
      'valid_until': '2000-01-01T00:00:00Z',
    });

    expect(entitlement.isLocallyActive, isFalse);
    expect(entitlement.streamId, isNull);
  });
}
