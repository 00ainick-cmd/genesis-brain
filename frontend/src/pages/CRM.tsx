import { useState } from 'react';
import { 
  Users, 
  Upload, 
  Plus,
  Search,
  Mail,
  Phone,
  Building2
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
}

// Placeholder contacts for demo
const PLACEHOLDER_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
    tags: ['lead', 'newsletter'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1 555-0123',
    tags: ['customer'],
  },
];

export function CRM() {
  const [contacts] = useState<Contact[]>(PLACEHOLDER_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00FF41]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#00FF41]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">CRM</h1>
            <p className="text-sm text-gray-500 font-mono">
              {contacts.length} contacts
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="card border-[#00FF41]/30 bg-[#00FF41]/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00FF41]/20 flex items-center justify-center">
            <span className="text-[#00FF41]">🚧</span>
          </div>
          <div>
            <p className="text-[#00FF41] font-medium">Coming Soon</p>
            <p className="text-sm text-gray-500">
              Full CRM with MailerLite integration is under development
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4"
          />
        </div>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No contacts found"
          description="Add contacts or import from MailerLite"
        />
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="card group hover:border-[#00FF41]/50">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#00FF41] font-bold text-lg">
                  {contact.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium group-hover:text-[#00FF41] transition-colors">
                    {contact.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex gap-1 flex-wrap">
                  {contact.tags?.map((tag) => (
                    <span 
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
