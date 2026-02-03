"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
} from "lucide-react"

import { NavUser } from '@/components/nav-user'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  chatHistory: [
    {
      id: "1",
      title: "Project Architecture Discussion",
      date: "Today",
    },
    {
      id: "2",
      title: "React Best Practices",
      date: "Yesterday",
    },
    {
      id: "3",
      title: "Database Schema Design",
      date: "2 days ago",
    },
    {
      id: "4",
      title: "Authentication Flow",
      date: "1 week ago",
    },
    {
      id: "5",
      title: "API Integration Testing",
      date: "2 weeks ago",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="gap-4">
        <Button className="w-full" size="sm">
          <Plus className="size-4" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-2">
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Chat History</p>
          </div>
          <SidebarMenu>
            {data.chatHistory.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  asChild
                  className="group hover:bg-sidebar-accent"
                >
                  <div className="flex items-center justify-between cursor-pointer flex-1">
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-sm truncate">{chat.title}</span>
                      <span className="text-xs text-muted-foreground">{chat.date}</span>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </button>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
