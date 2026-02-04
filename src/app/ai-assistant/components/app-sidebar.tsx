"use client"

import * as React from "react"
import {
  MoreHorizontal,
  SquarePen,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import { useUserInfo } from "@/hooks/useUserInfo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Chat = {
  id: string
  title: string | null
  updated_at: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  chats: Chat[]
  activeChatId: string | null
  onOpenChat: (id: string) => void
  refreshChats: () => void
}

function groupChatsByDate(chats: Chat[]) {
  const now = new Date()
  
  const groups: Record<string, Chat[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  }

  for (const chat of chats) {
    const created = new Date(chat.updated_at)
    const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

    if (diff < 1) groups.Today.push(chat)
    else if (diff < 2) groups.Yesterday.push(chat)
    else if (diff < 7) groups["Previous 7 Days"].push(chat)
    else if (diff < 30) groups["Previous 30 Days"].push(chat)
    else groups.Older.push(chat)
  }

  return groups
}

export function AppSidebar({
  chats,
  activeChatId,
  onOpenChat,
  refreshChats,
  ...props
}: AppSidebarProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState("")
  const { user } = useUserInfo();
  const grouped = React.useMemo(() => groupChatsByDate(chats), [chats])
  const router = useRouter();
  async function deleteChat(id: string) {
    await fetch(`/api/chats/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    refreshChats()
  }

  async function renameChat(id: string) {
    await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    setEditingId(null)
    refreshChats()
  }
  const userData = user ? {
    name: user.name || "User",
    email: user.email || "",
    avatar: user.avatar || "",
  } : {
    name: "Guest",
    email: "",
    avatar: "",
  };
  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-4 border-b">
        <Button
          onClick={() => onOpenChat("new")}
          className="w-full justify-start items-center gap-2"
          variant="ghost"
        >
          <SquarePen className="size-5 mb-1"/>
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="py-3 overflow-y-auto">
        {Object.entries(grouped).map(([label, chats]) =>
          chats.length ? (
            <div key={label} className="mb-6">
              <div className="px-3 mb-2 text-xs font-medium text-muted-foreground capitalize tracking-wide">
                {label}
              </div>

              <div className="flex flex-col gap-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onOpenChat(chat.id)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                      "transition-all duration-150 ease-out",
                      "hover:bg-accent",
                      activeChatId === chat.id &&
                        "bg-muted border border-border font-medium"
                    )}
                  >

                    {editingId === chat.id ? (
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => renameChat(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameChat(chat.id)
                        }}
                        className="bg-transparent outline-none text-sm w-full"
                      />
                    ) : (
                      <span className="text-sm truncate flex-1">
                        {chat.title || "New Chat"}
                      </span>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="transition-opacity p-1 rounded-md hover:bg-accent"
                        >
                          <MoreHorizontal className="size-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(chat.id)
                            setTitle(chat.title || "")
                          }}
                        >
                          Rename
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                            router.push("/ai-assistant/new")
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
      <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
