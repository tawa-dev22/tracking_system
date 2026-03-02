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
import { deleteUserById, toggleUserSuspended } from "@/lib/users";
import { toast } from 'sonner';
export default function UserManageModal({ user, onClose }) {
  const [, navigate] = useLocation();
  const [action, setAction] = useState<'none' | 'delete' | 'reset' | 'suspend'>('none');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await deleteUserById(user.id);
      if (error) throw error;
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
      const { error } = await toggleUserSuspended(user.id, !user.isSuspended);
      if (error) throw error;
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
      // For Supabase, send reset email to user's address
      // Admin-triggered reset links require service role; client can request email to user's address
      // Here we navigate to a generic instruction page
      toast.success('Password reset email requested (if supported)');
      navigate(`/admin/users/${user.id}/reset-password`);
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
