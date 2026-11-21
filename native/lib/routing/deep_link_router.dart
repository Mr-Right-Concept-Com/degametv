enum NativeDestination {
  tickets,
  playback,
  support,
  studio,
  dashboard,
  checkoutReturn,
}

class DeepLinkRouter {
  const DeepLinkRouter._();

  static NativeDestination? destinationFor(
    Uri uri, {
    String? canonicalWebHost,
  }) {
    final List<String> segments;
    if (uri.scheme == 'degametv') {
      segments = [
        if (uri.host.isNotEmpty) uri.host,
        ...uri.pathSegments,
      ];
    } else if (uri.scheme == 'https' &&
        canonicalWebHost != null &&
        uri.host.toLowerCase() == canonicalWebHost.toLowerCase()) {
      segments = uri.pathSegments;
    } else {
      return null;
    }

    final nonEmptySegments = segments.where((segment) => segment.isNotEmpty).toList();
    final route = nonEmptySegments.isEmpty ? null : nonEmptySegments.first.toLowerCase();
    return switch (route) {
      'ticket' || 'tickets' => NativeDestination.tickets,
      'playback' || 'watch' => NativeDestination.playback,
      'support' || 'help' => NativeDestination.support,
      'studio' || 'creator-studio' => NativeDestination.studio,
      'dashboard' || 'account' => NativeDestination.dashboard,
      'payment' || 'checkout' => NativeDestination.checkoutReturn,
      _ => null,
    };
  }
}
