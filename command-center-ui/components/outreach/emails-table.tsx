'use client';

/**
 * Emails Table Component
 * Display composed emails in a table with sorting, filtering, and actions
 */

import { useState } from 'react';
import { Mail, Eye, MoreHorizontal } from 'lucide-react';
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { formatDateTime } from '@/lib/utils/format';
import type { Email } from '@/lib/types';

interface EmailsTableProps {
  emails: Email[];
  loading?: boolean;
  onEmailClick?: (email: Email) => void;
  onSendEmail?: (emailId: string) => void;
  onScheduleEmail?: (emailId: string) => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400' },
  reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' },
  sent: { label: 'Sent', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400' }
};

export function EmailsTable({
  emails,
  loading = false,
  onEmailClick,
  onSendEmail,
  onScheduleEmail
}: EmailsTableProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const handleRowClick = (email: Email) => {
    onEmailClick?.(email);
  };

  const handleSelectEmail = (emailId: string, selected: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (selected) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Composed Emails
            </CardTitle>
            <CardDescription>
              {emails.length} email{emails.length !== 1 ? 's' : ''} composed
              {selectedEmails.size > 0 && ` • ${selectedEmails.size} selected`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No emails composed yet</p>
            <p className="text-sm mt-2">
              Compose your first email using the "Compose" tab
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Company</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-[120px]">Strategy</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => {
                  const statusConfig = STATUS_CONFIG[email.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

                  return (
                    <TableRow
                      key={email.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(email)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{email.company_name || 'Unknown Company'}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {email.contact_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md truncate" title={email.email_subject}>
                          {email.email_subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {email.email_strategy?.replace(/-/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(email.created_at)}
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
                            <DropdownMenuItem onClick={() => handleRowClick(email)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
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

export default EmailsTable;
