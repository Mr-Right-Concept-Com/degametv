class Screening {
  const Screening({
    required this.id,
    required this.title,
    required this.slug,
    required this.currency,
    this.description,
    this.posterUrl,
    this.bannerUrl,
    this.date,
    this.eventType,
    this.price,
  });

  final String id, title, slug, currency;
  final String? description, posterUrl, bannerUrl, eventType;
  final DateTime? date;
  final num? price;

  factory Screening.fromJson(Map<String, dynamic> row, {String? countryCode}) {
    final pricing = row['location_pricing'];
    final isNigeria = countryCode?.toUpperCase() == 'NG';
    final regionalPrice = pricing is Map
        ? pricing[isNigeria ? 'nigeria' : 'international']
        : null;
    final currency = isNigeria ? 'NGN' : 'USD';
    return Screening(
      id: row['id']?.toString() ?? '',
      title: row['title']?.toString() ?? 'Untitled',
      slug: row['slug']?.toString() ?? '',
      description: row['description']?.toString(),
      posterUrl: row['poster_url']?.toString(),
      bannerUrl: row['banner_url']?.toString(),
      date: DateTime.tryParse(row['screening_date']?.toString() ?? ''),
      eventType: row['event_type']?.toString(),
      price: num.tryParse(regionalPrice?.toString() ?? ''),
      currency: currency,
    );
  }
}
