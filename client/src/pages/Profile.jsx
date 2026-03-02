import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, User, Shield, Calendar } from 'lucide-react';
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const { user, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!supabase || !user?.id) {
        throw new Error("Supabase not configured or user missing");
      }
      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name,
          email: formData.email,
        })
        .eq("id", user.id);
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-black">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-black">
        User not found
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black">Profile</h1>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Main Profile Card */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="space-y-6">
          {/* Name Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-black mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            {isEditing ? (
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="text-black placeholder-gray-500 bg-white border border-gray-300"
                disabled={isSaving}
              />
            ) : (
              <p className="text-black text-lg">{user.name || 'Not set'}</p>
            )}
          </div>

          {/* Email Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-black mb-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            {isEditing ? (
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="text-black placeholder-gray-500 bg-white border border-gray-300"
                disabled={isSaving}
              />
            ) : (
              <p className="text-black text-lg">{user.email || 'Not set'}</p>
            )}
          </div>

          {/* Role Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-black mb-2">
              <Shield className="w-4 h-4" />
              Role
            </label>
            <Badge
              variant={user.role === 'admin' ? 'default' : 'secondary'}
              className={user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}
            >
              {user.role}
            </Badge>
          </div>

          {/* Account Created Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-black mb-2">
              <Calendar className="w-4 h-4" />
              Account Created
            </label>
            <p className="text-black text-lg">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Last Sign In */}
          <div>
            <label className="text-sm font-semibold text-black">Last Sign In</label>
            <p className="text-black text-lg">
              {new Date(user.lastSignedIn).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: user.name || '',
                  email: user.email || '',
                });
              }}
              disabled={isSaving}
              variant="outline"
              className="flex-1 text-black border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {/* Account Status Card */}
      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h2 className="text-lg font-semibold text-black mb-3">Account Status</h2>
        <div className="space-y-2 text-sm text-black">
          <p>
            <strong>Status:</strong> <Badge className="bg-green-600 text-white">Active</Badge>
          </p>
          <p>
            <strong>Login Method:</strong> {user.loginMethod || 'Standard'}
          </p>
          <p>
            <strong>Account ID:</strong> <code className="bg-white px-2 py-1 rounded text-xs">{user.id}</code>
          </p>
        </div>
      </Card>

      {/* Security Card */}
      <Card className="p-6 bg-white border border-gray-200">
        <h2 className="text-lg font-semibold text-black mb-4">Security</h2>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full text-black border border-gray-300 hover:bg-gray-100"
          >
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full text-black border border-gray-300 hover:bg-gray-100"
          >
            Two-Factor Authentication
          </Button>
        </div>
      </Card>
    </div>
  );
}
