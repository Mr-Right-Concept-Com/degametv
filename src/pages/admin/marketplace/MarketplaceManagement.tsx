import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, Store, FileText, DollarSign, Users, TrendingUp, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const mockListings = [
  { id: '1', title: 'Action Movie Collection', seller: 'FilmStudio Pro', type: 'movie', price: 5000, license: 'exclusive', status: 'approved', views: 1234, inquiries: 45 },
  { id: '2', title: 'Documentary Series', seller: 'DocuWorld', type: 'series', price: 12000, license: 'non-exclusive', status: 'pending', views: 567, inquiries: 12 },
  { id: '3', title: 'Music Video Bundle', seller: 'MusicViz', type: 'short', price: 2500, license: 'limited', status: 'approved', views: 890, inquiries: 23 },
];

const mockContracts = [
  { id: '1', content: 'Action Movie Collection', buyer: 'StreamCo', seller: 'FilmStudio Pro', value: 5000, status: 'active', signedAt: '2024-01-15', expiresAt: '2025-01-15' },
  { id: '2', content: 'Documentary Series', buyer: 'EduChannel', seller: 'DocuWorld', value: 12000, status: 'pending_signature', signedAt: null, expiresAt: null },
];

const stats = [
  { label: 'Total Listings', value: '1,234', change: '+15%', icon: Store },
  { label: 'Active Contracts', value: '456', change: '+8%', icon: FileText },
  { label: 'Total GMV', value: '$2.4M', change: '+22%', icon: DollarSign },
  { label: 'Distributors', value: '89', change: '+12%', icon: Users },
];

export default function MarketplaceManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AdminLayout
      title="Content Marketplace"
      description="Manage content listings, licensing, and distributor relationships"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-green-500">{stat.change}</span>
                    </div>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="distributors">Distributors</TabsTrigger>
            <TabsTrigger value="royalties">Royalties</TabsTrigger>
          </TabsList>

          {/* Listings */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Listing
                </Button>
              </div>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockListings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">{listing.title}</TableCell>
                        <TableCell>{listing.seller}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{listing.type}</Badge>
                        </TableCell>
                        <TableCell>${listing.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{listing.license}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={listing.status === 'approved' ? 'default' : 'outline'}>
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>{listing.views} views</span>
                            <span className="text-muted-foreground ml-2">• {listing.inquiries} inquiries</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Listing</DropdownMenuItem>
                              <DropdownMenuItem>View Inquiries</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts */}
          <TabsContent value="contracts" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Licensing Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.content}</TableCell>
                        <TableCell>{contract.buyer}</TableCell>
                        <TableCell>{contract.seller}</TableCell>
                        <TableCell>${contract.value.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={contract.status === 'active' ? 'default' : 'outline'}>
                            {contract.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contract.signedAt || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{contract.expiresAt || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributors */}
          <TabsContent value="distributors">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Distributor management coming soon</p>
                <p className="text-sm mt-2">Manage distributor relationships and syndication</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Royalties */}
          <TabsContent value="royalties">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Royalty tracking coming soon</p>
                <p className="text-sm mt-2">Track royalties per creator and tenant</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
