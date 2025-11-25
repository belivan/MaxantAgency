'use client';

/**
 * Prospect Details Modal Component
 * Displays comprehensive information about a prospect including business intelligence
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Globe,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Star,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
  Briefcase,
  FileText
} from 'lucide-react';
import { formatPhone, formatDateTime } from '@/lib/utils/format';
import type { Prospect } from '@/lib/types';

interface ProspectDetailsModalProps {
  prospect: Prospect | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProspectDetailsModal({ prospect, isOpen, onClose }: ProspectDetailsModalProps) {
  if (!prospect) return null;

  const bi = prospect.business_intelligence;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {prospect.company_name}
          </DialogTitle>
          <DialogDescription>
            {prospect.industry && <span className="font-medium">{prospect.industry}</span>}
            {prospect.city && prospect.state && (
              <span className="text-muted-foreground"> • {prospect.city}, {prospect.state}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="intelligence">Business Intelligence</TabsTrigger>
            <TabsTrigger value="social">Social & Contact</TabsTrigger>
          </TabsList>

          {/* BASIC INFO TAB */}
          <TabsContent value="basic" className="space-y-4">
            {/* Website & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Website
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospect.website && (
                  <div>
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {prospect.website}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                {prospect.website_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={prospect.website_status === 'active' ? 'default' : 'destructive'}>
                      {prospect.website_status}
                    </Badge>
                  </div>
                )}
                {prospect.crawl_error_details?.error_message && (
                  <div className="text-sm text-destructive">
                    ⚠️ {prospect.crawl_error_details.error_message}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prospect.contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{prospect.contact_name}</span>
                  </div>
                )}
                {prospect.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${prospect.contact_email}`} className="text-primary hover:underline">
                      {prospect.contact_email}
                    </a>
                  </div>
                )}
                {prospect.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${prospect.contact_phone}`} className="text-primary hover:underline">
                      {formatPhone(prospect.contact_phone)}
                    </a>
                  </div>
                )}
                {prospect.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{prospect.address}</span>
                  </div>
                )}
                {!prospect.contact_name && !prospect.contact_email && !prospect.contact_phone && !prospect.address && (
                  <p className="text-sm text-muted-foreground">No contact information available</p>
                )}
              </CardContent>
            </Card>

            {/* Google Rating */}
            {prospect.google_rating && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Google Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{prospect.google_rating.toFixed(1)}</span>
                    {prospect.google_review_count && (
                      <span className="text-muted-foreground">({prospect.google_review_count} reviews)</span>
                    )}
                  </div>
                  {prospect.most_recent_review_date && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Latest review: {formatDateTime(prospect.most_recent_review_date)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Description & Services */}
            {(prospect.description || (prospect.services && prospect.services.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prospect.description && (
                    <div>
                      <h4 className="font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">{prospect.description}</p>
                    </div>
                  )}
                  {prospect.services && prospect.services.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {prospect.services.map((service: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Record Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {prospect.created_at && (
                  <div>
                    <span className="text-muted-foreground">Created:</span> {formatDateTime(prospect.created_at)}
                  </div>
                )}
                {prospect.updated_at && (
                  <div>
                    <span className="text-muted-foreground">Updated:</span> {formatDateTime(prospect.updated_at)}
                  </div>
                )}
                {prospect.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{prospect.status}</Badge>
                  </div>
                )}
                {prospect.icp_match_score !== null && prospect.icp_match_score !== undefined && (
                  <div>
                    <span className="text-muted-foreground">ICP Match Score:</span> {prospect.icp_match_score}/100
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BUSINESS INTELLIGENCE TAB */}
          <TabsContent value="intelligence" className="space-y-4">
            {!bi && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No business intelligence data available for this prospect.</p>
                  <p className="text-sm mt-2">This data is extracted during prospecting.</p>
                </CardContent>
              </Card>
            )}

            {bi && (
              <>
                {/* Company Size */}
                {bi.companySize && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Company Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {bi.companySize.employeeCount && (
                        <div>
                          <span className="font-medium">Employees:</span> {bi.companySize.employeeCount}
                        </div>
                      )}
                      {bi.companySize.locationCount && (
                        <div>
                          <span className="font-medium">Locations:</span> {bi.companySize.locationCount}
                        </div>
                      )}
                      {bi.companySize.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Confidence: <Badge variant="outline">{bi.companySize.confidence}</Badge>
                        </div>
                      )}
                      {bi.companySize.signals && bi.companySize.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.companySize.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.companySize.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Years in Business */}
                {bi.yearsInBusiness && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Years in Business
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {bi.yearsInBusiness.estimatedYears && (
                        <div className="text-2xl font-bold">
                          {bi.yearsInBusiness.estimatedYears} years
                        </div>
                      )}
                      {bi.yearsInBusiness.foundedYear && (
                        <div>
                          <span className="font-medium">Founded:</span> {bi.yearsInBusiness.foundedYear}
                        </div>
                      )}
                      {bi.yearsInBusiness.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Confidence: <Badge variant="outline">{bi.yearsInBusiness.confidence}</Badge>
                        </div>
                      )}
                      {bi.yearsInBusiness.signals && bi.yearsInBusiness.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.yearsInBusiness.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.yearsInBusiness.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Pricing Visibility */}
                {bi.pricingVisibility && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Pricing Visibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Pricing Visible:</span>
                        <Badge variant={bi.pricingVisibility.visible ? 'default' : 'secondary'}>
                          {bi.pricingVisibility.visible ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      {bi.pricingVisibility.priceRange && (
                        <div>
                          <span className="font-medium">Price Range:</span> ${bi.pricingVisibility.priceRange.min}
                          {bi.pricingVisibility.priceRange.max && ` - $${bi.pricingVisibility.priceRange.max}`}
                        </div>
                      )}
                      {bi.pricingVisibility.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Confidence: <Badge variant="outline">{bi.pricingVisibility.confidence}</Badge>
                        </div>
                      )}
                      {bi.pricingVisibility.signals && bi.pricingVisibility.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.pricingVisibility.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.pricingVisibility.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Content Freshness */}
                {bi.contentFreshness && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Content Freshness
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {bi.contentFreshness.lastUpdate && (
                        <div>
                          <span className="font-medium">Last Updated:</span> {formatDateTime(bi.contentFreshness.lastUpdate)}
                        </div>
                      )}
                      {bi.contentFreshness.blogActive !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Blog Active:</span>
                          <Badge variant={bi.contentFreshness.blogActive ? 'default' : 'secondary'}>
                            {bi.contentFreshness.blogActive ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      )}
                      {bi.contentFreshness.postCount !== undefined && (
                        <div>
                          <span className="font-medium">Posts Found:</span> {bi.contentFreshness.postCount}
                        </div>
                      )}
                      {bi.contentFreshness.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Confidence: <Badge variant="outline">{bi.contentFreshness.confidence}</Badge>
                        </div>
                      )}
                      {bi.contentFreshness.signals && bi.contentFreshness.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.contentFreshness.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.contentFreshness.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Decision Maker Accessibility */}
                {bi.decisionMakerAccessibility && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Decision Maker Accessibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">Direct Email:</span>
                          <Badge variant={bi.decisionMakerAccessibility.hasDirectEmail ? 'default' : 'secondary'}>
                            {bi.decisionMakerAccessibility.hasDirectEmail ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">Direct Phone:</span>
                          <Badge variant={bi.decisionMakerAccessibility.hasDirectPhone ? 'default' : 'secondary'}>
                            {bi.decisionMakerAccessibility.hasDirectPhone ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      {bi.decisionMakerAccessibility.ownerName && (
                        <div>
                          <span className="font-medium">Owner/Decision Maker:</span> {bi.decisionMakerAccessibility.ownerName}
                        </div>
                      )}
                      {bi.decisionMakerAccessibility.confidence && (
                        <div className="text-sm text-muted-foreground">
                          Confidence: <Badge variant="outline">{bi.decisionMakerAccessibility.confidence}</Badge>
                        </div>
                      )}
                      {bi.decisionMakerAccessibility.signals && bi.decisionMakerAccessibility.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.decisionMakerAccessibility.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.decisionMakerAccessibility.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Premium Features */}
                {bi.premiumFeatures && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Premium Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {bi.premiumFeatures.detected && bi.premiumFeatures.detected.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Detected Features</h4>
                          <div className="flex flex-wrap gap-2">
                            {bi.premiumFeatures.detected.map((feature: string, idx: number) => (
                              <Badge key={idx} variant="default">
                                {feature.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {bi.premiumFeatures.budgetIndicator && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Budget Indicator:</span>
                          <Badge
                            variant={
                              bi.premiumFeatures.budgetIndicator === 'high'
                                ? 'default'
                                : bi.premiumFeatures.budgetIndicator === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {bi.premiumFeatures.budgetIndicator.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                      {bi.premiumFeatures.signals && bi.premiumFeatures.signals.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">Evidence ({bi.premiumFeatures.signals.length})</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {bi.premiumFeatures.signals.map((signal: string, idx: number) => (
                                <li key={idx}>• {signal}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* SOCIAL & CONTACT TAB */}
          <TabsContent value="social" className="space-y-4">
            {/* Social Profiles */}
            {prospect.social_profiles && Object.keys(prospect.social_profiles).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Social Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prospect.social_profiles.facebook && (
                    <a
                      href={prospect.social_profiles.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Facebook className="w-5 h-5" />
                      Facebook
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {prospect.social_profiles.instagram && (
                    <a
                      href={prospect.social_profiles.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {prospect.social_profiles.linkedin && (
                    <a
                      href={prospect.social_profiles.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Linkedin className="w-5 h-5" />
                      LinkedIn
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {prospect.social_profiles.twitter && (
                    <a
                      href={prospect.social_profiles.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Twitter className="w-5 h-5" />
                      Twitter
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Social Metadata */}
            {prospect.social_metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(prospect.social_metadata, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {!prospect.social_profiles && !prospect.social_metadata && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No social media information available for this prospect.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ProspectDetailsModal;
