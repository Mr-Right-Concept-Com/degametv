class TicketEntitlement {
  const TicketEntitlement({
    required this.entitlementId,
    required this.sourceType,
    required this.ticketType,
    required this.entitlementStatus,
    required this.isActive,
    this.screeningId,
    this.streamId,
    this.ticketCode,
    this.email,
    this.currency,
    this.price,
    this.paymentStatus,
    this.purchasedAt,
    this.validUntil,
    this.revokedAt,
  });

  final String entitlementId;
  final String sourceType;
  final String ticketType;
  final String entitlementStatus;
  final bool isActive;
  final String? screeningId;
  final String? streamId;
  final String? ticketCode;
  final String? email;
  final String? currency;
  final num? price;
  final String? paymentStatus;
  final DateTime? purchasedAt;
  final DateTime? validUntil;
  final DateTime? revokedAt;

  bool get isLocallyActive {
    if (!isActive || revokedAt != null) return false;
    if (validUntil != null && !validUntil!.isAfter(DateTime.now())) return false;
    return !const {'expired', 'revoked', 'refunded', 'pending'}.contains(
      entitlementStatus.toLowerCase(),
    );
  }

  factory TicketEntitlement.fromJson(Map<String, dynamic> row) {
    DateTime? dateValue(Object? value) =>
        value == null ? null : DateTime.tryParse(value.toString());
    num? numberValue(Object? value) {
      if (value is num) return value;
      return value == null ? null : num.tryParse(value.toString());
    }

    return TicketEntitlement(
      entitlementId: row['entitlement_id']?.toString() ?? '',
      sourceType: row['source_type']?.toString() ?? 'unknown',
      ticketType: row['ticket_type']?.toString() ?? 'unknown',
      entitlementStatus: row['entitlement_status']?.toString() ?? 'unknown',
      isActive: row['is_active'] == true,
      screeningId: row['screening_id']?.toString(),
      streamId: row['stream_id']?.toString(),
      ticketCode: row['ticket_code']?.toString(),
      email: row['email']?.toString(),
      currency: row['currency']?.toString(),
      price: numberValue(row['price']),
      paymentStatus: row['payment_status']?.toString(),
      purchasedAt: dateValue(row['purchased_at']),
      validUntil: dateValue(row['valid_until']),
      revokedAt: dateValue(row['revoked_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'entitlement_id': entitlementId,
        'source_type': sourceType,
        'ticket_type': ticketType,
        'entitlement_status': entitlementStatus,
        'is_active': isActive,
        'screening_id': screeningId,
        'stream_id': streamId,
        'ticket_code': ticketCode,
        'email': email,
        'currency': currency,
        'price': price,
        'payment_status': paymentStatus,
        'purchased_at': purchasedAt?.toIso8601String(),
        'valid_until': validUntil?.toIso8601String(),
        'revoked_at': revokedAt?.toIso8601String(),
      };
}
