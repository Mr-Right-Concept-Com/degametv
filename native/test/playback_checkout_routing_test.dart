import 'package:degametv_native/models/wallet_models.dart';
import 'package:degametv_native/routing/deep_link_router.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('routes custom deep links to tickets, playback, support and studio', () {
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://tickets')),
      NativeDestination.tickets,
    );
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://playback')),
      NativeDestination.playback,
    );
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://support')),
      NativeDestination.support,
    );
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://studio')),
      NativeDestination.studio,
    );
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://dashboard')),
      NativeDestination.dashboard,
    );
    expect(
      DeepLinkRouter.destinationFor(Uri.parse('degametv://payment/return')),
      NativeDestination.checkoutReturn,
    );
  });

  test('accepts HTTPS deep links only from the configured canonical host', () {
    expect(
      DeepLinkRouter.destinationFor(
        Uri.parse('https://watch.example/tickets/123'),
        canonicalWebHost: 'watch.example',
      ),
      NativeDestination.tickets,
    );
    expect(
      DeepLinkRouter.destinationFor(
        Uri.parse('https://attacker.example/support'),
        canonicalWebHost: 'watch.example',
      ),
      isNull,
    );
  });

  test('parses secure checkout and playback handoff responses', () {
    final checkout = CheckoutHandoff.fromResponse({
      'success': true,
      'walletPaid': false,
      'reference': 'DTV-ORDER-1',
      'authorizationUrl': 'https://checkout.example/session/1',
    });
    expect(checkout.checkoutUrl?.scheme, 'https');
    expect(checkout.walletPaid, isFalse);

    final grant = PlaybackGrant.fromResponse({
      'success': true,
      'playbackUrl': 'https://media.example/signed/asset.m3u8',
      'expiresAt': '2026-11-21T13:00:00Z',
    });
    expect(grant.playbackUrl.scheme, 'https');
    expect(grant.expiresAt, isNotNull);
  });

  test('rejects non-HTTPS provider handoff URLs', () {
    expect(
      () => CheckoutHandoff.fromResponse({
        'success': true,
        'walletPaid': false,
        'authorizationUrl': 'http://untrusted.example/checkout',
      }),
      throwsFormatException,
    );
    expect(
      () => PlaybackGrant.fromResponse({
        'success': true,
        'playbackUrl': 'javascript:alert(1)',
      }),
      throwsFormatException,
    );
  });
}
