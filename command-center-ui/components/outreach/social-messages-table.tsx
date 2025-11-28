'use client';

/**
 * Social Messages Table Component
 * Display composed social media DMs with platform badges, filtering, and actions
 */

import { useState } from 'react';
import { MessageSquare, Eye, Send, MoreHorizontal, Instagram, Facebook, Linkedin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { formatDateTime } from '@/lib/utils/format';
import type { SocialMessage } from '@/lib/types';

interface SocialMessagesTableProps {
  messages: SocialMessage[];
  loading?: boolean;
  onMessageClick?: (message: SocialMessage) => void;
  onSendMessage?: (messageId: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400' },
  reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' },
  sent: { label: 'Sent', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400' }
};

const PLATFORM_CONFIG = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400 border-pink-600'
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-600'
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border-sky-600'
  },
  twitter: {
    label: 'Twitter',
    icon: MessageSquare,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 border-cyan-600'
  }
};

export function SocialMessagesTable({
  messages,
  loading = false,
  onMessageClick,
  onSendMessage
}: SocialMessagesTableProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const handleRowClick = (message: SocialMessage) => {
    onMessageClick?.(message);
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Social Messages
            </CardTitle>
            <CardDescription>
              {messages.length} message{messages.length !== 1 ? 's' : ''} composed
              {selectedMessages.size > 0 && ` • ${selectedMessages.size} selected`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No social messages composed yet</p>
            <p className="text-sm mt-2">
              Compose your first social DM using the "Compose" tab
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Company</TableHead>
                  <TableHead className="w-[100px]">Platform</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead className="w-[120px]">Strategy</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => {
                  const statusConfig = STATUS_CONFIG[message.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const platformConfig = PLATFORM_CONFIG[message.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.instagram;
                  const PlatformIcon = platformConfig.icon;

                  return (
                    <TableRow
                      key={message.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(message)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{message.company_name || 'Unknown Company'}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {message.contact_name || 'No contact'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={platformConfig.color}>
                          <PlatformIcon className="w-3 h-3 mr-1" />
                          {platformConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md" title={message.message_body}>
                          {truncateMessage(message.message_body)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {message.strategy?.replace(/-/g, ' ') || 'Default'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(message.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleRowClick(message)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {message.status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onSendMessage?.(message.id)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Now
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SocialMessagesTable;
