'use client';
import {useState} from 'react';
import {TriangleAlert} from 'lucide-react';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';

function NoticeText(){return <><p className="mint-notice-title">OFFICIAL MINT ONLY</p><p>Official RE:TRY mint addresses will ONLY be published on this website.</p><p>Never trust mint addresses shared by third parties, social media accounts, DMs, or unofficial websites.</p><p>Always verify the mint address here before interacting with a token.</p></>}

export default function MintNotice(){
 const [hoverOpen,setHoverOpen]=useState(false),[pinned,setPinned]=useState(false);
 return <Popover open={pinned} onOpenChange={setPinned}>
  <TooltipProvider delayDuration={150}>
   <Tooltip open={hoverOpen&&!pinned} onOpenChange={setHoverOpen}>
    <PopoverTrigger asChild><TooltipTrigger asChild><button className="mint-notice-trigger" type="button" aria-label="Official mint address information" onFocus={()=>setHoverOpen(true)} onBlur={()=>setHoverOpen(false)} onPointerEnter={event=>{if(event.pointerType==='mouse')setHoverOpen(true)}} onPointerLeave={()=>setHoverOpen(false)}><TriangleAlert size={15} aria-hidden="true"/></button></TooltipTrigger></PopoverTrigger>
    <TooltipContent className="mint-notice-panel" side="bottom" align="start" sideOffset={8} collisionPadding={16}><NoticeText/></TooltipContent>
   </Tooltip>
  </TooltipProvider>
  <PopoverContent className="mint-notice-panel" side="bottom" align="start" sideOffset={8} collisionPadding={16} onOpenAutoFocus={event=>event.preventDefault()} aria-label="Official mint address notice"><NoticeText/></PopoverContent>
 </Popover>
}
