import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Users, Search, RefreshCw, Mail } from 'lucide-react';
import type { User } from '@/types';

interface UserListProps {
    onFetchUsers: (filters?: any) => Promise<User[]>;
}

export function UserList({ onFetchUsers }: UserListProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [filterClass, setFilterClass] = useState<string>('all');
    const [filterBoard, setFilterBoard] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await onFetchUsers();
            setUsers(fetchedUsers);
            setHasLoaded(true);
        } catch (error) {
            console.error("Failed to load users", error);
            alert("Failed to load users list.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        // Role filter: only show students usually? Or all? Let's show all but maybe filter by class implies students.

        // Class Filter
        if (filterClass !== 'all' && user.class !== Number(filterClass)) return false;

        // Board Filter
        if (filterBoard !== 'all' && user.board !== filterBoard) return false;

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return (
                user.name.toLowerCase().includes(lowerTerm) ||
                user.email.toLowerCase().includes(lowerTerm)
            );
        }

        return true;
    });

    return (
        <Card className="elevated-card bg-white dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Users className="w-5 h-5 text-primary" />
                    Registered Users
                </CardTitle>
                <Button
                    onClick={loadUsers}
                    disabled={isLoading}
                    variant={hasLoaded ? "outline" : "default"}
                    className={!hasLoaded ? "gradient-primary text-white" : ""}
                >
                    {isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {hasLoaded ? 'Refresh List' : 'Load Users'}
                </Button>
            </CardHeader>

            <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex">
                        <Select value={filterClass} onValueChange={setFilterClass}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                <SelectItem value="9">Class 9</SelectItem>
                                <SelectItem value="10">Class 10</SelectItem>
                                <SelectItem value="11">Class 11</SelectItem>
                                <SelectItem value="12">Class 12</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterBoard} onValueChange={setFilterBoard}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Board" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Boards</SelectItem>
                                <SelectItem value="CBSE">CBSE</SelectItem>
                                <SelectItem value="Odisha">Odisha</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* List Content */}
                {!hasLoaded ? (
                    <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-dashed">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Click "Load Users" to view the registered student list.</p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-gray-900/50 border-b dark:border-gray-700 p-3 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-4">User Details</div>
                                <div className="col-span-4">Email</div>
                                <div className="col-span-2 text-center">Class & Board</div>
                                <div className="col-span-2 text-right">Joined</div>
                            </div>
                            <div className="divide-y dark:divide-gray-700">
                                {filteredUsers.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No users found matching your filters.
                                    </div>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <div key={user.id} className="p-3 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <Mail className="w-3 h-3 text-muted-foreground" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                {user.role === 'student' ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                            Class {user.class}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">{user.board}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-right text-xs text-muted-foreground">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground text-right">
                            Showing {filteredUsers.length} users
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
