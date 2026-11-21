import 'package:degametv_native/data/entitlement_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('serializes and restores the secure offline entitlement snapshot', () {
    final snapshot = EntitlementSnapshot.fromCache(
      '{"fetched_at":"2026-11-21T12:00:00.000Z","entitlements":['
      '{"entitlement_id":"cache-1","source_type":"live","ticket_type":"live",'
      '"entitlement_status":"active","is_active":true,"stream_id":"stream-1",'
      '"valid_until":"2099-01-01T00:00:00.000Z"}]}',
    );

    expect(snapshot.isStale, isTrue);
    expect(snapshot.entitlements, hasLength(1));
    expect(snapshot.entitlements.single.streamId, 'stream-1');

    final restored = EntitlementSnapshot.fromCache(snapshot.toCacheJson());
    expect(restored.isStale, isTrue);
    expect(restored.entitlements.single.entitlementId, 'cache-1');
    expect(restored.fetchedAt, snapshot.fetchedAt);
  });
}
