import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
// User type from database schema
interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  isSuspended: boolean;
  passwordResetToken: string | null;
  passwordResetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

interface UserManageModalProps {
  user: User;
  onClose: () => void;
}

export default function UserManageModal({ user, onClose }: UserManageModalProps) {
  const [, navigate] = useLocation();
  const [action, setAction] = useState<'none' | 'delete' | 'reset' | 'suspend'>('none');
  const [isLoading, setIsLoading] = useState(false);

  const deleteUserMutation = trpc.users.delete.useMutation();
  const suspendUserMutation = trpc.users.suspend.useMutation();
  const resetPasswordMutation = trpc.users.resetPassword.useMutation();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteUserMutation.mutateAsync({ id: user.id });
      toast.success('User deleted successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    } finally {
      setIsLoading(false);
      setAction('none');
    }
  };

  const handleSuspend = async () => {
    setIsLoading(true);
    try {
      await suspendUserMutation.mutateAsync({
        id: user.id,
        suspend: !user.isSuspended,
      });
      toast.success(
        user.isSuspended ? 'User unsuspended successfully' : 'User suspended successfully'
      );
      onClose();
    } catch (error) {
      toast.error('Failed to update user status');
      console.error(error);
    } finally {
      setIsLoading(false);
      setAction('none');
    }
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const result = await resetPasswordMutation.mutateAsync({ userId: user.id });
      toast.success('Password reset token generated');
      // Navigate to password reset page with token
      navigate(`/admin/users/${user.id}/reset-password?token=${result.token}`);
      onClose();
    } catch (error) {
      toast.error('Failed to generate reset token');
      console.error(error);
    } finally {
      setIsLoading(false);
      setAction('none');
    }
  };

  return (
    <>
      {/* Main Dialog */}
      <AlertDialog open={action === 'none'} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <AlertDialogContent className="bg-white text-black border border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Manage User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              <div className="mt-2 space-y-1">
                <p><strong>Name:</strong> {user.name || 'N/A'}</p>
                <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Status:</strong> {user.isSuspended ? 'Suspended' : 'Active'}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Action Buttons */}
          <div className="space-y-2 mt-4">
            <Button
              onClick={() => setAction('reset')}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Reset Password
            </Button>

            <Button
              onClick={() => setAction('suspend')}
              disabled={isLoading}
              variant="outline"
              className="w-full text-black border-gray-300 hover:bg-gray-100"
            >
              {user.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
            </Button>

            <Button
              onClick={() => setAction('delete')}
              disabled={isLoading}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Delete User
            </Button>

            <Button
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              className="w-full text-black border-gray-300 hover:bg-gray-100"
            >
              Close
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={action === 'delete'} onOpenChange={(open) => {
        if (!open) setAction('none');
      }}>
        <AlertDialogContent className="bg-white text-black border border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete <strong>{user.name || user.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              disabled={isLoading}
              className="text-black border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={action === 'suspend'} onOpenChange={(open) => {
        if (!open) setAction('none');
      }}>
        <AlertDialogContent className="bg-white text-black border border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">
              {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {user.isSuspended
                ? `Are you sure you want to unsuspend ${user.name || user.email}? They will be able to access their account again.`
                : `Are you sure you want to suspend ${user.name || user.email}? They will not be able to access their account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              disabled={isLoading}
              className="text-black border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={isLoading}
              className={user.isSuspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}
            >
              {isLoading ? 'Updating...' : (user.isSuspended ? 'Unsuspend' : 'Suspend')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={action === 'reset'} onOpenChange={(open) => {
        if (!open) setAction('none');
      }}>
        <AlertDialogContent className="bg-white text-black border border-gray-300">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Reset Password</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Generate a password reset link for <strong>{user.name || user.email}</strong>? They will receive an email with instructions to set a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              disabled={isLoading}
              className="text-black border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Generating...' : 'Generate Reset Link'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
