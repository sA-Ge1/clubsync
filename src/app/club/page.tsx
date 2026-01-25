"use client"
import { ClubManagement } from "@/components/ClubManagement"
import { useUserInfo } from "@/hooks/useUserInfo"
import { Loader2 } from "lucide-react";
export default function ClubPage(){
  const {user,loading}=useUserInfo();
  if(loading||!user){
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    
  }
  return <ClubManagement clubId={user.user_id}/>
}