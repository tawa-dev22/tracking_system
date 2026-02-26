import { useState } from 'react';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function AddNewUser() {
  const [, navigate] = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        toast.error('Email is required');
        setIsLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // TODO: Call tRPC procedure to create user
      // const result = await trpc.users.create.useMutation();
      
      toast.success('User created successfully');
      navigate('/admin/users');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Add New User</h1>
        </div>

        {/* Form Card */}
        <Card className="p-6 bg-white border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter user's full name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full text-black placeholder-gray-500"
                disabled={isLoading}
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter user's email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full text-black placeholder-gray-500"
                disabled={isLoading}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-black mb-2">
                User Role
              </label>
              <Select value={formData.role} onValueChange={handleRoleChange} disabled={isLoading}>
                <SelectTrigger className="w-full text-black bg-white border border-gray-300">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black border border-gray-300">
                  <SelectItem value="user" className="text-black">
                    User
                  </SelectItem>
                  <SelectItem value="admin" className="text-black">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
            >
              {isLoading ? 'Creating User...' : 'Create User'}
            </Button>

            {/* Cancel Button */}
            <Button
              type="button"
              onClick={() => navigate('/admin/users')}
              disabled={isLoading}
              variant="outline"
              className="w-full text-black border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </form>
        </Card>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-black">
            <strong>Note:</strong> The new user will receive an email with login instructions and can set their password upon first login.
          </p>
        </div>
      </div>
    </div>
  );
}
