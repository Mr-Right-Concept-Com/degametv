import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/wallet_repository.dart';
import '../degame_app.dart';
import '../models/screening.dart';
import '../models/wallet_models.dart';

class ScreeningPurchaseSheet extends StatefulWidget {
  const ScreeningPurchaseSheet({
    super.key,
    required this.screening,
    required this.countryCode,
    required this.currencyCode,
    required this.openWeb,
  });

  final Screening screening;
  final String? countryCode;
  final String? currencyCode;
  final Future<void> Function(String path) openWeb;

  @override
  State<ScreeningPurchaseSheet> createState() => _ScreeningPurchaseSheetState();
}

class _ScreeningPurchaseSheetState extends State<ScreeningPurchaseSheet> {
  late final WalletRepository repository;
  List<WalletBalance> balances = const [];
  List<PaymentMethod> methods = const [];
  String? currency;
  String selectedMethod = 'personal_wallet';
  bool loading = true;
  bool submitting = false;
  String? error;

  bool get isLive => widget.screening.eventType?.toLowerCase() == 'live';

  @override
  void initState() {
    super.initState();
    repository = WalletRepository(Supabase.instance.client);
    unawaited(_load());
  }

  Future<void> _load() async {
    if (Supabase.instance.client.auth.currentUser == null) {
      if (mounted) setState(() => loading = false);
      return;
    }
    if (widget.countryCode == null || widget.countryCode!.isEmpty) {
      if (mounted) {
        setState(() {
          error = 'Country could not be resolved from the published runtime configuration.';
          loading = false;
        });
      }
      return;
    }

    List<WalletBalance> loadedBalances = const [];
    List<PaymentMethod> loadedMethods = const [];
    String? loadError;
    try {
      loadedBalances = await repository.balances();
    } catch (exception) {
      loadError = exception.toString().replaceFirst('Exception: ', '');
    }
    try {
      loadedMethods = await repository.paymentMethods();
    } catch (exception) {
      loadError ??= exception.toString().replaceFirst('Exception: ', '');
    }
    if (!mounted) return;

    final configuredCurrency = widget.currencyCode?.toUpperCase();
    setState(() {
      balances = loadedBalances;
      methods = loadedMethods;
      currency = configuredCurrency != null &&
              RegExp(r'^[A-Z]{3}$').hasMatch(configuredCurrency)
          ? configuredCurrency
          : null;
      if (currency == null) {
        error = 'A valid transaction currency was not returned by runtime configuration.';
      } else if (!balances.any((balance) => balance.currency == currency)) {
        for (final method in methods) {
          if (method.supportedCurrencies.contains(currency)) {
            selectedMethod = method.id;
            break;
          }
        }
      }
      if (loadError != null && balances.isEmpty && methods.isEmpty) {
        error = loadError;
      }
      loading = false;
    });
  }

  Future<void> _checkout() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null || user.email == null || user.email!.isEmpty) {
      setState(() => error = 'Sign in with a verified email address before checkout.');
      return;
    }
    final country = widget.countryCode;
    final selectedCurrency = currency;
    if (country == null || selectedCurrency == null) {
      setState(() => error = 'A verified country and transaction currency are required.');
      return;
    }
    setState(() {
      submitting = true;
      error = null;
    });
    try {
      final result = isLive
          ? await repository.checkoutLiveEvent(
              screeningId: widget.screening.id,
              countryCode: country,
              currency: selectedCurrency,
              method: selectedMethod,
            )
          : await repository.checkoutScreening(
              screeningId: widget.screening.id,
              countryCode: country,
              currency: selectedCurrency,
              method: selectedMethod,
            );
      if (result.walletPaid) {
        if (!mounted) return;
        final issuedCodes = [
          if (result.watchCode != null && result.watchCode!.isNotEmpty)
            'Watch code: ${result.watchCode}',
          if (result.ticketCode != null && result.ticketCode!.isNotEmpty)
            'Ticket code: ${result.ticketCode}',
        ];
        await showDialog<void>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Purchase confirmed'),
            content: Text(issuedCodes.isEmpty
                ? 'Personal Wallet checkout completed. Your entitlement is refreshing.'
                : 'Personal Wallet checkout completed.\\n\\n${issuedCodes.join('\\n')}'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Continue'),
              ),
            ],
          ),
        );
        if (mounted) Navigator.of(context).pop(true);
        return;
      }
      final checkoutUrl = result.checkoutUrl;
      if (checkoutUrl == null ||
          !await launchUrl(checkoutUrl, mode: LaunchMode.externalApplication)) {
        throw StateError('The external checkout page could not be opened.');
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (exception) {
      if (mounted) {
        setState(() {
          error = exception.toString().replaceFirst('Exception: ', '');
          submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    WalletBalance? selectedBalance;
    for (final balance in balances) {
      if (balance.currency == currency) {
        selectedBalance = balance;
        break;
      }
    }
    final eligibleMethods = methods
        .where((method) =>
            currency != null && method.supportedCurrencies.contains(currency))
        .toList(growable: false);
    final walletAvailable = balances.any((balance) => balance.currency == currency);
    final selectedExists = selectedMethod == 'personal_wallet'
        ? walletAvailable
        : eligibleMethods.any((method) => method.id == selectedMethod);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          MediaQuery.viewInsetsOf(context).bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isLive ? 'Get live-event access' : 'Get screening access',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(widget.screening.title, style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 18),
              TextButton.icon(
                onPressed: () => widget.openWeb('/movie/${Uri.encodeComponent(widget.screening.slug)}'),
                icon: const Icon(Icons.open_in_new),
                label: const Text('View full event details'),
              ),
              if (user == null)
                const Text('Sign in to use Personal Wallet or start authenticated checkout.')
              else if (loading)
                const Center(child: CircularProgressIndicator(color: red))
              else ...[
                if (currency != null) ...[
                  Text('Transaction currency: $currency'),
                  const SizedBox(height: 8),
                  Text(
                    selectedBalance == null
                        ? 'No $currency Personal Wallet balance is available on this account.'
                        : 'Personal Wallet: $currency ${selectedBalance.balanceMajor}',
                    style: const TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 12),
                ],
                DropdownButtonFormField<String>(
                  initialValue: selectedMethod,
                  decoration: const InputDecoration(labelText: 'Payment method'),
                  items: [
                    DropdownMenuItem(
                      value: 'personal_wallet',
                      enabled: walletAvailable,
                      child: const Text('Personal Wallet'),
                    ),
                    ...eligibleMethods.map((method) => DropdownMenuItem(
                          value: method.id,
                          child: Text(method.name),
                        )),
                  ],
                  onChanged: submitting
                      ? null
                      : (value) {
                          if (value != null) setState(() => selectedMethod = value);
                        },
                ),
                if (!selectedExists)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('Select an available payment method.'),
                  ),
                if (eligibleMethods.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'No external provider is currently enabled for this currency.',
                      style: TextStyle(color: Colors.white60),
                    ),
                  ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(error!, style: const TextStyle(color: Colors.redAccent)),
                  ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: submitting || loading || !selectedExists || currency == null
                        ? null
                        : _checkout,
                    child: Text(submitting ? 'Starting checkout…' : 'Continue to secure checkout'),
                  ),
                ),
              ],
              if (error != null && user == null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(error!, style: const TextStyle(color: Colors.redAccent)),
                ),
              if (loading == false && user == null)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Text('Close this sheet, sign in, and reopen the event to continue.'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
