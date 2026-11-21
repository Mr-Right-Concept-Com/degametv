class WalletBalance {
  const WalletBalance({
    required this.currency,
    required this.balanceMinor,
    required this.balanceMajor,
  });

  final String currency;
  final int balanceMinor;
  final num balanceMajor;

  factory WalletBalance.fromJson(Map<String, dynamic> row) {
    final minorValue = row['balance_minor'];
    final majorValue = row['balance_major'];
    return WalletBalance(
      currency: row['currency']?.toString() ?? '',
      balanceMinor: minorValue is num
          ? minorValue.toInt()
          : int.tryParse(minorValue?.toString() ?? '') ?? 0,
      balanceMajor: majorValue is num
          ? majorValue
          : num.tryParse(majorValue?.toString() ?? '') ?? 0,
    );
  }
}

class WalletActivity {
  const WalletActivity({
    required this.id,
    required this.activityType,
    required this.direction,
    required this.amountMajor,
    required this.currency,
    required this.status,
    required this.description,
    required this.createdAt,
    this.reference,
  });

  final String id;
  final String activityType;
  final String direction;
  final num amountMajor;
  final String currency;
  final String status;
  final String description;
  final DateTime? createdAt;
  final String? reference;

  factory WalletActivity.fromJson(Map<String, dynamic> row) {
    final amount = row['amount_major'];
    return WalletActivity(
      id: row['id']?.toString() ?? '',
      activityType: row['activity_type']?.toString() ?? 'activity',
      direction: row['direction']?.toString() ?? 'unknown',
      amountMajor: amount is num ? amount : num.tryParse(amount?.toString() ?? '') ?? 0,
      currency: row['currency']?.toString() ?? '',
      status: row['status']?.toString() ?? 'unknown',
      description: row['description']?.toString() ?? '',
      createdAt: DateTime.tryParse(row['created_at']?.toString() ?? ''),
      reference: row['reference']?.toString(),
    );
  }
}

class PaymentMethod {
  const PaymentMethod({
    required this.id,
    required this.name,
    required this.supportedCurrencies,
  });

  final String id;
  final String name;
  final List<String> supportedCurrencies;

  factory PaymentMethod.fromJson(Map<String, dynamic> row) => PaymentMethod(
        id: row['id']?.toString() ?? '',
        name: row['name']?.toString() ?? row['id']?.toString() ?? '',
        supportedCurrencies: (row['supportedCurrencies'] is List)
            ? (row['supportedCurrencies'] as List)
                .map((value) => value.toString().toUpperCase())
                .toList(growable: false)
            : const [],
      );
}

class CheckoutHandoff {
  const CheckoutHandoff({
    required this.reference,
    required this.walletPaid,
    this.checkoutUrl,
    this.ticketCode,
    this.watchCode,
  });

  final String reference;
  final bool walletPaid;
  final Uri? checkoutUrl;
  final String? ticketCode;
  final String? watchCode;

  factory CheckoutHandoff.fromResponse(Map<String, dynamic> data) {
    if (data['success'] != true) {
      throw StateError(data['error']?.toString() ?? 'Checkout could not be started.');
    }
    final walletPaid = data['walletPaid'] == true;
    Uri? checkout;
    if (!walletPaid) {
      final value = data['authorizationUrl'] ?? data['checkoutUrl'];
      if (value is! String) throw const FormatException('Checkout URL is missing.');
      checkout = Uri.tryParse(value);
      if (checkout == null || checkout.scheme != 'https' || checkout.host.isEmpty) {
        throw const FormatException('Checkout URL is not a trusted HTTPS URL.');
      }
    }
    return CheckoutHandoff(
      reference: data['reference']?.toString() ?? '',
      walletPaid: walletPaid,
      checkoutUrl: checkout,
      ticketCode: data['ticketCode']?.toString(),
      watchCode: data['watchCode']?.toString(),
    );
  }
}

class PlaybackGrant {
  const PlaybackGrant({
    required this.playbackUrl,
    required this.expiresAt,
    this.sessionToken,
  });

  final Uri playbackUrl;
  final DateTime? expiresAt;
  final String? sessionToken;

  factory PlaybackGrant.fromResponse(Map<String, dynamic> data) {
    if (data['success'] != true || data['playbackUrl'] is! String) {
      throw StateError(data['error']?.toString() ?? 'Playback authorization failed.');
    }
    final url = Uri.tryParse(data['playbackUrl'] as String);
    if (url == null || url.scheme != 'https' || url.host.isEmpty) {
      throw const FormatException('Playback URL must use HTTPS.');
    }
    return PlaybackGrant(
      playbackUrl: url,
      expiresAt: DateTime.tryParse(data['expiresAt']?.toString() ?? ''),
      sessionToken: data['sessionToken']?.toString(),
    );
  }
}
