import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/wallet_models.dart';

class WalletRepository {
  WalletRepository(this.client);

  final SupabaseClient client;

  Future<List<WalletBalance>> balances() async {
    _requireUser();
    final rows = await client.rpc('get_my_personal_wallet_balances');
    if (rows is! List) {
      throw const FormatException('Wallet balance response is invalid.');
    }
    return rows
        .whereType<Map>()
        .map((row) => WalletBalance.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  }

  Future<List<WalletActivity>> activity({int limit = 50}) async {
    _requireUser();
    final rows = await client.rpc(
      'get_my_wallet_activity',
      params: {'p_limit': limit},
    );
    if (rows is! List) {
      throw const FormatException('Wallet activity response is invalid.');
    }
    return rows
        .whereType<Map>()
        .map((row) => WalletActivity.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>?> tenantConfig() async {
    _requireUser();
    final result = await client.rpc('get_my_tenant_config');
    if (result is List && result.isNotEmpty && result.first is Map) {
      return Map<String, dynamic>.from(result.first as Map);
    }
    if (result is Map) {
      return Map<String, dynamic>.from(result);
    }
    return null;
  }

  Future<List<PaymentMethod>> paymentMethods() async {
    final response = await client.functions.invoke(
      'list-payment-methods',
      method: HttpMethod.get,
    );
    if (response.status != 200 || response.data is! Map) {
      throw StateError('External payment methods are unavailable.');
    }
    final data = Map<String, dynamic>.from(response.data as Map);
    final methods = data['methods'];
    if (methods is! List) {
      return const [];
    }
    return methods
        .whereType<Map>()
        .map((row) => PaymentMethod.fromJson(Map<String, dynamic>.from(row)))
        .where((method) => method.id.isNotEmpty && method.supportedCurrencies.isNotEmpty)
        .toList(growable: false);
  }

  Future<CheckoutHandoff> checkoutScreening({
    required String screeningId,
    required String countryCode,
    required String currency,
    required String method,
  }) async {
    final user = _requireUser();
    final email = user.email;
    if (email == null || email.trim().isEmpty) {
      throw StateError('A verified account email is required for ticket checkout.');
    }
    final response = await client.functions.invoke(
      'process-payment',
      body: {
        'method': method,
        'email': email,
        'screeningId': screeningId,
        'location': countryCode.toUpperCase() == 'NG' ? 'nigeria' : 'international',
        'countryCode': countryCode.toUpperCase(),
        'currency': currency.toUpperCase(),
      },
    );
    if (response.status < 200 || response.status >= 300 || response.data is! Map) {
      final data = response.data;
      throw StateError(
        data is Map
            ? data['error']?.toString() ?? 'Screening checkout failed.'
            : 'Screening checkout failed.',
      );
    }
    return CheckoutHandoff.fromResponse(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<CheckoutHandoff> checkoutLiveEvent({
    required String screeningId,
    required String countryCode,
    required String currency,
    required String method,
  }) async {
    final user = _requireUser();
    final response = await client.functions.invoke(
      'process-live-payment',
      body: {
        'screeningId': screeningId,
        'ticketType': 'live',
        'method': method,
        'currency': currency.toUpperCase(),
        'countryCode': countryCode.toUpperCase(),
        'email': user.email,
      },
    );
    if (response.status < 200 || response.status >= 300 || response.data is! Map) {
      final data = response.data;
      throw StateError(
        data is Map
            ? data['error']?.toString() ?? 'Live event checkout failed.'
            : 'Live event checkout failed.',
      );
    }
    return CheckoutHandoff.fromResponse(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  User _requireUser() {
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Sign in before accessing your wallet.');
    }
    return user;
  }
}