import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from "@tanstack/react-query";
import { listUsers } from "@/lib/users";
import { toast } from 'sonner';
import { Search, Plus, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserManageModal from './UserManageModal';

export default function UserListPreview() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);

  const { data: allUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["users", "list"],
    queryFn: async () => {
      const { data, error } = await listUsers();
      if (error) {
        toast.error("Failed to load users");
        console.error(error);
        return [];
      }
      return data;
    },
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;

    const query = searchQuery.toLowerCase();
    return allUsers.filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  const handleManageClick = (user) => {
    setSelectedUser(user);
    setShowManageModal(true);
  };

  const handleCloseModal = () => {
    setShowManageModal(false);
    setSelectedUser(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">Users</h2>
        <Button
          onClick={() => navigate('/admin/users/add')}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-black placeholder-gray-500 bg-white border border-gray-300"
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border border-gray-200 bg-white">
        {isLoading ? (
          <div className="p-6 text-center text-black">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-black">
            {searchQuery ? 'No users found matching your search.' : 'No users available.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-black">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-black">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-black">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-black">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-black">Created</th>
                  <th className="px-6 py-3 text-center font-semibold text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-3 text-black font-medium">{user.name || 'N/A'}</td>
                    <td className="px-6 py-3 text-black">{user.email || 'N/A'}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={user.isSuspended ? 'destructive' : 'default'}
                        className={user.isSuspended ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}
                      >
                        {user.isSuspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-black text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-black hover:bg-gray-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border border-gray-200">
                          <DropdownMenuItem
                            onClick={() => handleManageClick(user)}
                            className="text-black cursor-pointer hover:bg-gray-100"
                          >
                            Manage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manage User Modal */}
      {showManageModal && selectedUser && (
        <UserManageModal
          user={selectedUser}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
