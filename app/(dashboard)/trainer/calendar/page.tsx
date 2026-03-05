"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Clock, User, X, Search, Calendar as CalendarIcon, Inbox, CheckCircle, XCircle, MessageSquare, AlertCircle, Play, AlertTriangle, UserX, CalendarX, Check, TrendingUp, Repeat, StickyNote, Dumbbell, Bell, CalendarDays, Timer, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/hooks/use-toast";
import { useUserStore } from "@/lib/stores/user-store";
import { useBookings, useAddSession, useUpdateSession, useCancelBooking } from "@/lib/hooks/use-bookings";
import { useTemplates } from "@/lib/hooks/use-templates";
import { useAvailability, useAddBlock, useDeleteBlock, getBlockedBlocks as getBlockedBlocksUtil, getBlocksForDate } from "@/lib/hooks/use-availability";
import { useServices } from "@/lib/hooks/use-services";
import { useBookingRequests, useAcceptBookingRequest, useDeclineBookingRequest } from "@/lib/hooks/use-booking-requests";
import { useClients } from "@/lib/hooks/use-clients";
import { useQueryClient } from "@tanstack/react-query";
import {
  generateTimeSlots,
  isTimeAvailable,
  calculateSessionHeight,
  getTimeRemaining,
  getStatusBadge,
  getGroupColorOverride,
  getReadableTextColor,
  shouldShowStatusBadge,
  getWeekDates,
  formatDate,
  formatTime,
} from "@/lib/utils/calendar-utils";
import type { CalendarSession } from "@/lib/types/calendar";
import type { SessionCompletionFormData } from "@/lib/types/session-completion";
import type { SignOffMode } from "@/lib/types";
import type { BlockReasonType, RecurrenceType } from "@/lib/types/availability";
import { cn } from "@/lib/utils/cn";

type ViewMode = "day" | "week";
type CalendarTab = "schedule" | "requests";

export default function TrainerCalendar() {
  const router = useRouter();

  // Store hooks
  const currentUser = useUserStore((state) => state.currentUser);
  const { sessions } = useBookings(currentUser?.id);
  const addSessionMutation = useAddSession();
  const updateSessionMutation = useUpdateSession();
  const cancelBookingMutation = useCancelBooking();
  const { data: templates = [] } = useTemplates(currentUser?.id);
  const { data: trainerAvailability } = useAvailability(currentUser?.id);
  const addBlockMutation = useAddBlock();
  const deleteBlockMutation = useDeleteBlock();
  const { data: services = [] } = useServices();
  const { data: bookingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const acceptRequestMutation = useAcceptBookingRequest();
  const declineRequestMutation = useDeclineBookingRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper functions to replace mock data functions
  const getServiceType = (serviceTypeId: string | null) => {
    if (!serviceTypeId) return null;
    const service = services.find(s => s.id === serviceTypeId);
    if (!service) return null;
    return {
      id: service.id,
      name: service.name,
      duration: service.duration,
      color: service.color,
      creditsRequired: service.creditsRequired,
      type: service.type, // '1-2-1' | 'duet' | 'group'
    };
  };

  // Helper: check if a session is a group class
  const isGroupClass = (serviceTypeId: string | null) => {
    const st = getServiceType(serviceTypeId);
    return st?.type === 'group';
  };

  const getClient = (clientId: string | null) => {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId) || null;
  };

  const getWorkoutTemplate = (templateId: string | null | undefined) => {
    if (!templateId) return null;
    return templates.find(t => t.id === templateId) || null;
  };

  // Availability helper functions (replaces imports from availability-data)
  const isWithinAvailability = (datetime: Date, availability: typeof trainerAvailability): boolean => {
    if (!availability) return false;
    const dayOfWeek = datetime.getDay();
    const hour = datetime.getHours();
    const minute = datetime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Check if time is within available blocks
    const isAvailable = availability.blocks.some((block) => {
      if (block.blockType !== 'available') return false;
      if (block.dayOfWeek !== dayOfWeek) return false;

      const blockStart = block.startHour * 60 + block.startMinute;
      const blockEnd = block.endHour * 60 + block.endMinute;

      return timeInMinutes >= blockStart && timeInMinutes < blockEnd;
    });

    if (!isAvailable) return false;

    // Check if time is blocked
    return !isTimeBlocked(datetime, availability);
  };

  const isTimeBlocked = (datetime: Date, availability: typeof trainerAvailability): boolean => {
    if (!availability) return false;
    const dayOfWeek = datetime.getDay();
    const hour = datetime.getHours();
    const minute = datetime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    const dateStr = datetime.toISOString().split('T')[0];

    return availability.blocks.some((block) => {
      if (block.blockType !== 'blocked') return false;

      // Check recurring weekly blocks
      if (block.recurrence === 'weekly') {
        if (block.dayOfWeek !== dayOfWeek) return false;

        const blockStart = block.startHour * 60 + block.startMinute;
        const blockEnd = block.endHour * 60 + block.endMinute;

        return timeInMinutes >= blockStart && timeInMinutes < blockEnd;
      }

      // Check one-time blocks
      if (block.recurrence === 'once' && block.specificDate) {
        if (block.specificDate !== dateStr) return false;

        if (!block.endDate || block.endDate === block.specificDate) {
          const blockStart = block.startHour * 60 + block.startMinute;
          const blockEnd = block.endHour * 60 + block.endMinute;
          return timeInMinutes >= blockStart && timeInMinutes < blockEnd;
        }

        if (block.endDate && dateStr >= block.specificDate && dateStr <= block.endDate) {
          const blockStart = block.startHour * 60 + block.startMinute;
          const blockEnd = block.endHour * 60 + block.endMinute;
          return timeInMinutes >= blockStart && timeInMinutes < blockEnd;
        }
      }

      return false;
    });
  };

  // Client-side only flag to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Responsive hour height: 48px on mobile, 64px on desktop (matches grid row height)
  const [hourHeight, setHourHeight] = useState(48);
  useEffect(() => {
    const updateHourHeight = () => {
      setHourHeight(window.innerWidth >= 1024 ? 64 : 48);
    };
    updateHourHeight();
    window.addEventListener('resize', updateHourHeight);
    return () => window.removeEventListener('resize', updateHourHeight);
  }, []);

  // Local state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [calendarTab, setCalendarTab] = useState<CalendarTab>("schedule");
  const { data: rawClients = [] } = useClients(currentUser?.id);
  const clients = useMemo(() => rawClients.map((c) => ({
    id: c.id,
    initials: `${(c.first_name || '')[0] || ''}${(c.last_name || '')[0] || ''}`.toUpperCase() || '??',
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
    color: `hsl(${Math.abs(c.id.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0) % 360)}, 70%, 50%)`,
    credits: c.credits || 0,
    phone: c.phone || undefined,
  })), [rawClients]);

  // Inline booking panel state (NO MODALS)
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSignOffMode, setSelectedSignOffMode] = useState<string | null>(null);
  const [selectedBookingClient, setSelectedBookingClient] = useState<string | null>(null);
  const [searchClient, setSearchClient] = useState("");

  // Inline session details state (NO MODALS)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [completingSessionId, setCompletingSessionId] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<SessionCompletionFormData>({
    rpe: 5,
    notes: "",
  });

  // Reschedule state (INLINE, NO MODALS)
  const [reschedulingSessionId, setReschedulingSessionId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");

  // Session setup panel state (for starting sessions without template/mode)
  const [showSessionSetupPanel, setShowSessionSetupPanel] = useState(false);
  const [setupSessionId, setSetupSessionId] = useState<string | null>(null);
  const [setupTemplateId, setSetupTemplateId] = useState<string | null>(null);
  const [setupSignOffMode, setSetupSignOffMode] = useState<SignOffMode | null>(null);

  // Block time panel state
  const [showBlockTimePanel, setShowBlockTimePanel] = useState(false);

  // Block removal confirmation
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
  const [deleteBlockDialog, setDeleteBlockDialog] = useState<{
    blockId: string;
    isRecurring: boolean;
    datetime: Date;
  } | null>(null);

  // Legend collapsed state (collapsed by default for experienced users)
  const [showLegend, setShowLegend] = useState(false);
  const [blockRecurrence, setBlockRecurrence] = useState<RecurrenceType>('once');
  const [blockDate, setBlockDate] = useState<string>('');
  const [blockEndDate, setBlockEndDate] = useState<string>('');
  const [blockDaysOfWeek, setBlockDaysOfWeek] = useState<number[]>([1]);
  const [blockStartTime, setBlockStartTime] = useState<string>('09:00');
  const [blockEndTime, setBlockEndTime] = useState<string>('17:00');
  const [blockReason, setBlockReason] = useState<BlockReasonType>('personal');
  const [blockNotes, setBlockNotes] = useState<string>('');

  // Drag & drop reschedule state (week view)
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ dayIndex: number; hour: number; minute: number } | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{
    sessionId: string;
    targetDate: Date;
    session: typeof sessions[0];
    oldDatetime: Date;
  } | null>(null);

  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSessionId(sessionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sessionId);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, absoluteHour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Calculate minute from Y position within the hour cell
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const minuteOffset = Math.floor((relativeY / rect.height) * 60);
    const snappedMinute = Math.floor(minuteOffset / 15) * 15;
    setDragOverInfo({ dayIndex, hour: absoluteHour, minute: Math.min(snappedMinute, 45) });
  };

  const handleDragLeave = () => {
    setDragOverInfo(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSessionId || !dragOverInfo) {
      setDraggedSessionId(null);
      setDragOverInfo(null);
      return;
    }

    const session = sessions.find((s) => s.id === draggedSessionId);
    if (!session || !session.serviceTypeId) {
      setDraggedSessionId(null);
      setDragOverInfo(null);
      return;
    }

    const targetDate = new Date(weekDates[dragOverInfo.dayIndex]);
    targetDate.setHours(dragOverInfo.hour, dragOverInfo.minute, 0, 0);

    const serviceType = getServiceType(session.serviceTypeId);
    if (!serviceType) {
      setDraggedSessionId(null);
      setDragOverInfo(null);
      return;
    }

    // Check conflicts (excluding dragged session)
    const otherSessions = sessions.filter((s) => s.id !== draggedSessionId);
    if (!isTimeAvailable(targetDate, serviceType.duration, otherSessions)) {
      toast({
        variant: "destructive",
        title: "Time Conflict",
        description: "This time slot is already booked",
      });
      setDraggedSessionId(null);
      setDragOverInfo(null);
      return;
    }

    const oldDatetime = new Date(session.datetime);

    // Store pending reschedule — show confirmation dialog instead of executing immediately
    setPendingReschedule({
      sessionId: draggedSessionId,
      targetDate,
      session,
      oldDatetime,
    });

    setDraggedSessionId(null);
    setDragOverInfo(null);
  };

  const [isRescheduling, setIsRescheduling] = useState(false);

  const confirmReschedule = () => {
    if (!pendingReschedule || isRescheduling) return;
    setIsRescheduling(true);
    const { sessionId, targetDate, session, oldDatetime } = pendingReschedule;
    setPendingReschedule(null);

    updateSessionMutation.mutate(sessionId, { datetime: targetDate });

    toast({
      title: "Session Rescheduled",
      description: `${session.clientName} moved to ${formatDate(targetDate)} at ${formatTime(targetDate)}`,
    });

    // Send reschedule notification email (fire-and-forget)
    const client = clients.find((c) => c.id === session.clientId);
    if (client) {
      fetch('/api/email/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: session.id,
          oldTime: oldDatetime.toISOString(),
          newTime: targetDate.toISOString(),
        }),
      }).catch(() => {}).finally(() => setIsRescheduling(false));
    } else {
      setIsRescheduling(false);
    }
  };

  const cancelReschedule = () => {
    setPendingReschedule(null);
  };

  const handleDragEnd = () => {
    setDraggedSessionId(null);
    setDragOverInfo(null);
  };

  // Mark as mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Soft hold expiry enforcement
  useEffect(() => {
    const checkExpiredHolds = () => {
      const now = new Date();
      let hasExpired = false;

      sessions.forEach((session) => {
        const holdExpiryDate = session.holdExpiry instanceof Date
          ? session.holdExpiry
          : session.holdExpiry ? new Date(session.holdExpiry) : null;

        if (
          session.status === "soft-hold" &&
          holdExpiryDate &&
          now > holdExpiryDate
        ) {
          hasExpired = true;
          updateSessionMutation.mutate(session.id, { status: "cancelled" as const });
        }
      });

      if (hasExpired) {
        toast({
          variant: "warning",
          title: "Soft Holds Expired",
          description: "Some soft hold bookings have expired and been removed",
        });
      }
    };

    // Check immediately
    checkExpiredHolds();

    // Check every minute
    const interval = setInterval(checkExpiredHolds, 60000);

    return () => clearInterval(interval);
    // Only depend on sessions length to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  // Navigation
  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(currentDate.getDate() + direction);
    } else {
      newDate.setDate(currentDate.getDate() + direction * 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMode('day');
  };

  // Get today's sessions
  const todaysSessions = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return sessions
      .filter((s) => s.datetime >= today && s.datetime < tomorrow)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }, [currentDate, sessions]);

  // Get week dates and sessions
  const weekDates = getWeekDates(currentDate);
  const weekSessions = useMemo(() => {
    return sessions.filter((s) => {
      return s.datetime >= weekDates[0] && s.datetime <= weekDates[6];
    });
  }, [sessions, weekDates]);

  // Time slots for quick booking
  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6am-8pm

  // Handle quick slot click
  const handleQuickSlotClick = (datetime: Date) => {
    if (isTimePast(datetime)) {
      toast({
        variant: "destructive",
        title: "Cannot Book in the Past",
        description: "Please select a future time slot",
      });
      return;
    }
    setSelectedSlot(datetime);
    setSelectedServiceType(services[0]?.id || null);
    setSelectedBookingClient(null);
    setShowBookingPanel(true);
    setSearchClient("");
  };

  // Handle session click
  const handleSessionClick = (sessionId: string) => {
    // If clicking from week view, switch to day view and navigate to that session's date
    if (viewMode === "week") {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentDate(new Date(session.datetime));
        setViewMode("day");
        setExpandedSessionId(sessionId);
      }
    } else {
      // In day view, just toggle expansion
      setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
    }
  };

  // Close booking panel
  const closeBookingPanel = () => {
    setShowBookingPanel(false);
    setSelectedSlot(null);
    setSelectedServiceType(null);
    setSelectedTemplateId(null);
    setSelectedSignOffMode(null);
    setSearchClient("");
  };

  // Open block time panel
  const openBlockTimePanel = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setBlockDate(dateStr);
    setBlockEndDate(dateStr);
    setBlockDaysOfWeek([today.getDay() || 1]);
    setBlockRecurrence('once');
    setBlockStartTime('09:00');
    setBlockEndTime('17:00');
    setBlockReason('personal');
    setBlockNotes('');
    setShowBlockTimePanel(true);
  };

  // Close block time panel
  const closeBlockTimePanel = () => {
    setShowBlockTimePanel(false);
  };

  // Create blocked time period
  const handleCreateBlock = () => {
    const [startHour, startMinute] = blockStartTime.split(':').map(Number);
    const [endHour, endMinute] = blockEndTime.split(':').map(Number);

    // Validation
    if (blockRecurrence === 'once' && !blockDate) {
      toast({
        variant: "destructive",
        title: "Missing Date",
        description: "Please select a date for the blocked period",
      });
      return;
    }

    if (blockRecurrence === 'weekly' && blockDaysOfWeek.length === 0) {
      toast({
        variant: "destructive",
        title: "No Days Selected",
        description: "Please select at least one day of the week",
      });
      return;
    }

    const effectiveRecurrence = blockRecurrence;
    const blockDayFromDate = blockDate ? new Date(blockDate).getDay() : 1;

    if (effectiveRecurrence === 'weekly') {
      // Create one block per selected day
      blockDaysOfWeek.forEach((dayOfWeek, i) => {
        const newBlock = {
          id: `block_${Date.now()}_${i}`,
          blockType: 'blocked' as const,
          dayOfWeek,
          startHour,
          startMinute,
          endHour,
          endMinute,
          recurrence: effectiveRecurrence,
          reason: blockReason,
          notes: blockNotes || undefined,
        };
        addBlockMutation.mutate(newBlock);
      });

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selectedDayNames = blockDaysOfWeek.sort().map((d) => dayNames[d]).join(', ');
      toast({
        title: "Time Blocked",
        description: `Blocked weekly on ${selectedDayNames} from ${blockStartTime} to ${blockEndTime}`,
      });
    } else {
      const newBlock = {
        id: `block_${Date.now()}`,
        blockType: 'blocked' as const,
        dayOfWeek: blockDayFromDate,
        startHour,
        startMinute,
        endHour,
        endMinute,
        recurrence: effectiveRecurrence,
        specificDate: blockDate,
        endDate: blockEndDate && blockEndDate !== blockDate ? blockEndDate : undefined,
        reason: blockReason,
        notes: blockNotes || undefined,
      };
      addBlockMutation.mutate(newBlock);
      toast({
        title: "Time Blocked",
        description: `Blocked on ${blockDate} from ${blockStartTime} to ${blockEndTime}`,
      });
    }

    closeBlockTimePanel();
  };

  // Create booking (instructor-led as per guide)
  const handleCreateBooking = (clientId: string, serviceTypeId: string, datetime: Date) => {
    const client = clients.find((c) => c.id === clientId);
    const serviceType = getServiceType(serviceTypeId);

    if (!client || !serviceType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Client or service type not found",
      });
      return;
    }

    // Check credits
    if (client.credits < serviceType.creditsRequired) {
      toast({
        variant: "destructive",
        title: "Insufficient Credits",
        description: `${client.name} needs ${serviceType.creditsRequired} credits but only has ${client.credits}`,
      });
      return;
    }

    // Check availability
    if (!isWithinAvailability(datetime, trainerAvailability)) {
      toast({
        variant: "destructive",
        title: "Outside Availability",
        description: "Trainer is not available at this time",
      });
      return;
    }

    // Check conflicts
    if (!isTimeAvailable(datetime, serviceType.duration, sessions)) {
      toast({
        variant: "destructive",
        title: "Time Conflict",
        description: "This time slot is already booked",
      });
      return;
    }

    // Create new session
    const newSession: CalendarSession = {
      id: `session_${Date.now()}`,
      datetime: datetime,
      clientId: client.id,
      clientName: client.name,
      clientColor: client.color,
      clientCredits: client.credits - serviceType.creditsRequired,
      status: "confirmed",
      serviceTypeId: serviceType.id,
      workoutId: null,
      templateId: selectedTemplateId || null,
      signOffMode: (selectedSignOffMode as SignOffMode) || undefined,
    };

    // Update sessions
    addSessionMutation.mutate(newSession);

    // Refresh clients to reflect updated credits
    queryClient.invalidateQueries({ queryKey: ['clients'] });

    // Success notification
    toast({
      title: "Booking Confirmed",
      description: `${client.name} booked for ${formatTime(datetime)} • ${serviceType.name}`,
    });

    // Close panel
    closeBookingPanel();
  };

  // Check in client for group class
  const handleCheckIn = (sessionId: string, status: 'checked-in' | 'late' | 'no-show') => {
    updateSessionMutation.mutate(sessionId, { status });
    const session = sessions.find((s) => s.id === sessionId);
    const statusLabel = status === 'checked-in' ? 'Checked In' : status === 'late' ? 'Late' : 'No Show';
    toast({
      title: statusLabel,
      description: `${session?.clientName} marked as ${statusLabel.toLowerCase()}`,
    });
  };

  // Start session
  const handleStartSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Group classes don't use templates - just check in
    if (isGroupClass(session.serviceTypeId ?? null)) {
      handleCheckIn(sessionId, 'checked-in');
      return;
    }

    // For 1:1 and duet sessions:
    // If session has template and sign-off mode, navigate directly
    if (session.templateId && session.signOffMode) {
      router.push(
        `/trainer/sessions/new?clientId=${session.clientId}&templateId=${session.templateId}&signOffMode=${session.signOffMode}`
      );
    } else {
      // Show setup panel - but template is now optional
      setSetupSessionId(sessionId);
      setSetupTemplateId(null);
      setSetupSignOffMode(null);
      setShowSessionSetupPanel(true);
    }
  };

  // Complete session
  const handleCompleteSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Show completion form
    setCompletingSessionId(sessionId);
    setCompletionData({ rpe: 5, notes: "" });
  };

  // Submit session completion
  const submitSessionCompletion = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    updateSessionMutation.mutate(sessionId, { status: "completed" });

    toast({
      title: "Session Completed",
      description: `${session.clientName}'s session saved with RPE ${completionData.rpe}/10`,
    });

    setCompletingSessionId(null);
    setExpandedSessionId(null);
  };

  // Quick rebook after completion
  const handleQuickRebook = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Pre-fill booking panel with same client and service type
    const nextWeek = new Date(session.datetime);
    nextWeek.setDate(nextWeek.getDate() + 7);

    setSelectedSlot(nextWeek);
    setSelectedServiceType(session.serviceTypeId ?? null);
    setSelectedBookingClient(null);
    setShowBookingPanel(true);
    setSearchClient(session.clientName ?? "");

    toast({
      title: "Quick Rebook",
      description: `Pre-filled for ${session.clientName ?? "client"} - Select time`,
    });
  };

  // Mark late
  const handleMarkLate = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    updateSessionMutation.mutate(sessionId, { status: "late" });

    toast({
      variant: "warning",
      title: "Marked as Late",
      description: `${session.clientName} - Late arrival recorded`,
    });
  };

  // Mark no show
  const handleMarkNoShow = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !session.serviceTypeId || !session.clientId) return;

    const serviceType = getServiceType(session.serviceTypeId);
    const client = clients.find((c) => c.id === session.clientId);

    if (!serviceType || !client) return;

    // Update session status
    updateSessionMutation.mutate(sessionId, { status: "no-show" });

    // Refresh clients to reflect refunded credits
    queryClient.invalidateQueries({ queryKey: ['clients'] });

    toast({
      variant: "destructive",
      title: "No Show",
      description: `${session.clientName} - Credit refunded`,
    });
  };

  // Cancel session
  const handleCancelSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !session.serviceTypeId || !session.clientId) return;

    const serviceType = getServiceType(session.serviceTypeId);
    const client = clients.find((c) => c.id === session.clientId);

    if (!serviceType || !client) return;

    // Remove session
    cancelBookingMutation.mutate(sessionId);

    // Refresh clients to reflect refunded credits
    queryClient.invalidateQueries({ queryKey: ['clients'] });

    toast({
      title: "Session Cancelled",
      description: `${session.clientName} - Credit refunded`,
    });

    setExpandedSessionId(null);
  };

  // Reschedule session (INLINE, NO MODALS)
  const handleRescheduleSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Pre-fill with current session datetime
    const currentDate = new Date(session.datetime);
    const dateStr = currentDate.toISOString().split('T')[0];
    const timeStr = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

    setReschedulingSessionId(sessionId);
    setRescheduleDate(dateStr);
    setRescheduleTime(timeStr);
  };

  // Submit reschedule
  const submitReschedule = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !session.serviceTypeId) return;

    if (!rescheduleDate || !rescheduleTime) {
      toast({
        variant: "destructive",
        title: "Invalid Date/Time",
        description: "Please select a valid date and time",
      });
      return;
    }

    // Create new datetime
    const newDatetime = new Date(`${rescheduleDate}T${rescheduleTime}`);

    // Check availability
    if (!isWithinAvailability(newDatetime, trainerAvailability)) {
      toast({
        variant: "destructive",
        title: "Outside Availability",
        description: "Trainer is not available at this time",
      });
      return;
    }

    const serviceType = getServiceType(session.serviceTypeId);
    if (!serviceType) return;

    // Check conflicts (excluding current session)
    const otherSessions = sessions.filter((s) => s.id !== sessionId);
    if (!isTimeAvailable(newDatetime, serviceType.duration, otherSessions)) {
      toast({
        variant: "destructive",
        title: "Time Conflict",
        description: "This time slot is already booked",
      });
      return;
    }

    // Update session datetime
    updateSessionMutation.mutate(sessionId, { datetime: newDatetime });

    toast({
      title: "Session Rescheduled",
      description: `${session.clientName} rescheduled to ${formatDate(newDatetime)} at ${formatTime(newDatetime)}`,
    });

    setReschedulingSessionId(null);
    setExpandedSessionId(null);
  };

  // Close session setup panel
  const closeSessionSetupPanel = () => {
    setShowSessionSetupPanel(false);
    setSetupSessionId(null);
    setSetupTemplateId(null);
    setSetupSignOffMode(null);
  };

  // Confirm session setup and start
  const confirmSessionSetup = () => {
    if (!setupSessionId) return;

    // If a template is selected, require sign-off mode
    if (setupTemplateId && !setupSignOffMode) {
      toast({
        variant: "destructive",
        title: "Incomplete Setup",
        description: "Please select a sign-off mode for the template",
      });
      return;
    }

    const session = sessions.find((s) => s.id === setupSessionId);
    if (!session) return;

    if (setupTemplateId) {
      // Update the calendar session with selected template and sign-off mode
      updateSessionMutation.mutate(setupSessionId, {
        templateId: setupTemplateId,
        signOffMode: setupSignOffMode || undefined,
      });

      // Navigate to session start page with template
      router.push(
        `/trainer/sessions/new?clientId=${session.clientId}&templateId=${setupTemplateId}&signOffMode=${setupSignOffMode}`
      );
    } else {
      // No template — navigate to session page without template params
      router.push(
        `/trainer/sessions/new?clientId=${session.clientId}`
      );
    }

    // Close setup panel
    closeSessionSetupPanel();
  };

  // Accept booking request
  const handleAcceptRequest = (requestId: string, selectedTime: Date) => {
    const request = bookingRequests.find((r) => r.id === requestId);
    if (!request || !request.serviceId) return;

    const client = clients.find((c) => c.id === request.clientId);
    const serviceType = getServiceType(request.serviceId);

    if (!client || !serviceType) return;

    // Check conflicts
    if (!isTimeAvailable(selectedTime, serviceType.duration, sessions)) {
      toast({
        variant: "destructive",
        title: "Time Conflict",
        description: "This time slot is already booked",
      });
      return;
    }

    const isSoftHold = client.credits < serviceType.creditsRequired;

    // Create session from request
    const newSession: CalendarSession = {
      id: `session_${Date.now()}`,
      datetime: selectedTime,
      clientId: request.clientId,
      clientName: request.clientName,
      clientColor: client.color,
      clientCredits: isSoftHold ? client.credits : client.credits - serviceType.creditsRequired,
      status: isSoftHold ? "soft-hold" : "confirmed",
      serviceTypeId: request.serviceId,
      workoutId: null,
    };

    addSessionMutation.mutate(newSession);

    // Refresh clients to reflect updated credits
    queryClient.invalidateQueries({ queryKey: ['clients'] });

    // Mark request as accepted via API (with soft-hold status if insufficient credits)
    acceptRequestMutation.mutate({
      requestId,
      acceptedTime: selectedTime.toISOString(),
      ...(isSoftHold && { bookingStatus: 'soft-hold' as const }),
    });

    if (isSoftHold) {
      toast({
        title: "Soft Hold — Top-Up Email Sent",
        description: `${request.clientName ?? "Client"} needs ${serviceType.creditsRequired - client.credits} more credit${serviceType.creditsRequired - client.credits !== 1 ? 's' : ''}. Holding spot for 24h.`,
      });
    } else {
      toast({
        title: "Request Accepted",
        description: `${request.clientName ?? "Client"} booked for ${formatTime(selectedTime)}`,
      });
    }
  };

  // Decline booking request
  const handleDeclineRequest = (requestId: string, reason?: string) => {
    const request = bookingRequests.find((r) => r.id === requestId);
    if (!request) return;

    // Decline request via API
    declineRequestMutation.mutate(requestId);

    toast({
      title: "Request Declined",
      description: `${request.clientName ?? "Client"}'s request has been declined`,
    });
  };

  // Get label for a blocked time slot
  const getBlockLabel = (datetime: Date): string => {
    if (!trainerAvailability) return 'BLOCKED';
    const dateStr = datetime.toISOString().split('T')[0];
    const dayOfWeek = datetime.getDay();
    const timeInMinutes = datetime.getHours() * 60 + datetime.getMinutes();

    const matchingBlock = trainerAvailability.blocks.find((block) => {
      if (block.blockType !== 'blocked') return false;
      const blockStart = block.startHour * 60 + block.startMinute;
      const blockEnd = block.endHour * 60 + block.endMinute;
      if (timeInMinutes < blockStart || timeInMinutes >= blockEnd) return false;

      if (block.recurrence === 'weekly') return block.dayOfWeek === dayOfWeek;
      if (block.recurrence === 'once' && block.specificDate) {
        if (!block.endDate || block.endDate === block.specificDate) return block.specificDate === dateStr;
        return dateStr >= block.specificDate && dateStr <= block.endDate;
      }
      return false;
    });

    if (matchingBlock) {
      if (matchingBlock.notes) return matchingBlock.notes;
      if (matchingBlock.reason) {
        const reasonLabels: Record<string, string> = {
          personal: 'Personal',
          lunch: 'Lunch',
          meeting: 'Meeting',
          holiday: 'Holiday',
          other: 'Blocked',
        };
        return reasonLabels[matchingBlock.reason] || matchingBlock.reason;
      }
    }
    return 'BLOCKED';
  };

  // Get block ID for a given time slot (for removal)
  const getBlockId = (datetime: Date): string | null => {
    if (!trainerAvailability) return null;
    const dateStr = datetime.toISOString().split('T')[0];
    const dayOfWeek = datetime.getDay();
    const timeInMinutes = datetime.getHours() * 60 + datetime.getMinutes();

    const matchingBlock = trainerAvailability.blocks.find((block) => {
      if (block.blockType !== 'blocked') return false;
      const blockStart = block.startHour * 60 + block.startMinute;
      const blockEnd = block.endHour * 60 + block.endMinute;
      if (timeInMinutes < blockStart || timeInMinutes >= blockEnd) return false;

      if (block.recurrence === 'weekly') return block.dayOfWeek === dayOfWeek;
      if (block.recurrence === 'once' && block.specificDate) {
        if (!block.endDate || block.endDate === block.specificDate) return block.specificDate === dateStr;
        return dateStr >= block.specificDate && dateStr <= block.endDate;
      }
      return false;
    });

    return matchingBlock?.id || null;
  };

  // Check if a block is recurring
  const isBlockRecurring = (blockId: string): boolean => {
    if (!trainerAvailability) return false;
    const block = trainerAvailability.blocks.find((b) => b.id === blockId);
    return block?.recurrence === 'weekly';
  };

  // Remove blocked time — now with recurring block dialog
  const handleRemoveBlock = (blockId: string, datetime?: Date) => {
    if (isBlockRecurring(blockId) && datetime) {
      setDeleteBlockDialog({ blockId, isRecurring: true, datetime });
      setRemovingBlockId(null);
      return;
    }
    deleteBlockMutation.mutate(blockId);
    toast({ title: "Block Removed", description: "Time block has been removed" });
    setRemovingBlockId(null);
  };

  // Remove single occurrence of recurring block (create an override)
  const handleRemoveSingleOccurrence = () => {
    if (!deleteBlockDialog) return;
    const { blockId, datetime } = deleteBlockDialog;
    const block = trainerAvailability?.blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Create a one-time "available" override for this specific date+time
    const overrideBlock = {
      id: `override_${Date.now()}`,
      blockType: 'available' as const,
      dayOfWeek: datetime.getDay(),
      startHour: block.startHour,
      startMinute: block.startMinute,
      endHour: block.endHour,
      endMinute: block.endMinute,
      recurrence: 'once' as const,
      specificDate: datetime.toISOString().split('T')[0],
    };
    addBlockMutation.mutate(overrideBlock);
    toast({ title: "Occurrence Removed", description: "This single occurrence has been removed" });
    setDeleteBlockDialog(null);
  };

  // Remove all occurrences of recurring block
  const handleRemoveAllOccurrences = () => {
    if (!deleteBlockDialog) return;
    deleteBlockMutation.mutate(deleteBlockDialog.blockId);
    toast({ title: "Block Removed", description: "All occurrences have been removed" });
    setDeleteBlockDialog(null);
  };

  // Check if time is in the past
  const isTimePast = (datetime: Date): boolean => {
    return datetime < new Date();
  };

  // Pending requests count
  const pendingRequestsCount = bookingRequests.filter(
    (r) => r.status === "pending"
  ).length;

  // Filtered clients
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchClient.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Calendar Controls - Fixed Header (Mobile & Desktop Optimized) */}
      <div className="fixed top-[73px] lg:top-0 left-0 right-0 lg:left-64 z-10 bg-white dark:bg-gray-800 shadow-md border-t border-gray-100 dark:border-gray-700">
        {/* View Toggle & Navigation */}
        <div className="p-2 lg:p-4 border-b border-wondrous-grey-light lg:px-8">
          <div className="lg:max-w-7xl lg:mx-auto">
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <div className="flex gap-1.5 lg:gap-2">
                <button
                  onClick={() => navigateDay(-1)}
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg hover:opacity-80 flex items-center justify-center font-bold text-sm bg-wondrous-grey-light text-wondrous-grey-dark active:scale-95 transition-transform"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={16} className="lg:w-[18px] lg:h-[18px]" />
                </button>
                <button
                  onClick={() => navigateDay(1)}
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg hover:opacity-80 flex items-center justify-center font-bold text-sm bg-wondrous-grey-light text-wondrous-grey-dark active:scale-95 transition-transform"
                  aria-label="Next day"
                >
                  <ChevronRight size={16} className="lg:w-[18px] lg:h-[18px]" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-2.5 lg:px-3 h-8 lg:h-9 rounded-lg text-[11px] lg:text-xs font-semibold hover:opacity-80 bg-wondrous-grey-light text-wondrous-grey-dark active:scale-95 transition-transform"
                  aria-label="Go to today"
                >
                  Today
                </button>
              </div>
              <div className="font-bold text-xs lg:text-sm text-wondrous-grey-dark dark:text-gray-100 font-heading">
                {viewMode === "day" ? (isMounted ? formatDate(currentDate) : "Loading...") : `Week View`}
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-3 py-1 text-[11px] lg:text-xs font-medium transition-all",
                  viewMode === "day"
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-wondrous-blue dark:border-wondrous-blue"
                    : "text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
                )}
                aria-label="Day view"
                aria-pressed={viewMode === "day"}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "px-3 py-1 text-[11px] lg:text-xs font-medium transition-all",
                  viewMode === "week"
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-wondrous-blue dark:border-wondrous-blue"
                    : "text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
                )}
                aria-label="Week view"
                aria-pressed={viewMode === "week"}
              >
                Week
              </button>
            </div>
          </div>
        </div>

        {/* Schedule/Requests Tabs */}
        <div className="border-b border-wondrous-grey-light bg-white lg:px-8">
          <div className="lg:max-w-7xl lg:mx-auto px-2 lg:px-0">
            <div className="flex gap-2 lg:gap-4">
              <button
                onClick={() => setCalendarTab("schedule")}
                className={cn(
                  "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 text-xs lg:text-sm font-semibold transition-all relative active:scale-95",
                  calendarTab === "schedule"
                    ? "text-wondrous-blue dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-wondrous-grey-dark dark:hover:text-gray-300"
                )}
                aria-label="Schedule tab"
                aria-pressed={calendarTab === "schedule"}
              >
                <CalendarIcon size={16} className="lg:w-[18px] lg:h-[18px]" />
                <span className="relative z-10">Schedule</span>
                {calendarTab === "schedule" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 lg:h-1 bg-wondrous-blue -z-0" />
                )}
              </button>
              <button
                onClick={() => setCalendarTab("requests")}
                className={cn(
                  "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 text-xs lg:text-sm font-semibold transition-all relative active:scale-95",
                  calendarTab === "requests"
                    ? "text-wondrous-blue dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-wondrous-grey-dark dark:hover:text-gray-300"
                )}
                aria-label="Requests tab"
                aria-pressed={calendarTab === "requests"}
              >
                <Inbox size={16} className="lg:w-[18px] lg:h-[18px]" />
                <span className="relative z-10">Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-wondrous-orange text-white text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded-full min-w-[18px] lg:min-w-[20px] text-center animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
                {calendarTab === "requests" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 lg:h-1 bg-wondrous-blue -z-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable with proper spacing */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 mt-[153px] lg:mt-[140px]">
        {/* SCHEDULE TAB */}
        {calendarTab === "schedule" && (
          <>
            {/* DAY VIEW */}
            {viewMode === "day" && (
          <div className="space-y-4">
            {/* Session List */}
            <div className="space-y-4">
              {todaysSessions.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
                  <CalendarDays size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">No sessions today</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">Would you like to block time or book a client?</div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={openBlockTimePanel}
                      variant="outline"
                      className="gap-2 border-slate-300 dark:border-slate-600"
                    >
                      <Clock size={16} />
                      Block Time
                    </Button>
                    <Button
                      onClick={() => {
                        const now = new Date();
                        now.setMinutes(0, 0, 0);
                        handleQuickSlotClick(now);
                      }}
                      className="gap-2 bg-gradient-to-r from-wondrous-blue to-wondrous-magenta hover:from-wondrous-dark-blue hover:to-wondrous-primary-hover"
                    >
                      <Plus size={16} />
                      Book a session
                    </Button>
                  </div>
                </div>
              ) : (
                todaysSessions.map((session) => {
                  const client = getClient(session.clientId);
                  const serviceType = getServiceType(session.serviceTypeId);
                  const statusInfo = getStatusBadge(session.status);
                  const workout = session.workoutId
                    ? getWorkoutTemplate(session.workoutId)
                    : null;
                  const isExpanded = expandedSessionId === session.id;

                  return (
                    <motion.div
                      key={session.id}
                      layout
                      className={cn(
                        "rounded-2xl shadow-md hover:shadow-xl cursor-pointer transition-all overflow-hidden",
                        session.status === "soft-hold"
                          ? "bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-400 dark:border-amber-600"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      )}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      {/* Soft Hold Banner */}
                      {session.status === "soft-hold" && (
                        <div className="bg-amber-100 dark:bg-amber-900/30 px-6 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                          <Clock size={14} />
                          Soft Hold
                          {session.holdExpiry && (
                            <span className="text-xs font-normal ml-auto">
                              {getTimeRemaining(session.holdExpiry)}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Session Card Header */}
                      <div className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div
                            style={{ background: client?.color || "#12229D" }}
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md"
                          >
                            {client?.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg text-wondrous-grey-dark dark:text-gray-100 mb-1">
                              {formatTime(session.datetime)} - {session.clientName}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span>{serviceType?.name}</span>
                              <span className="text-gray-400 dark:text-gray-500">&middot;</span>
                              <span>{serviceType?.duration} min</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-3xl font-bold font-heading",
                              session.status === "soft-hold"
                                ? "text-amber-500 dark:text-amber-400"
                                : "text-wondrous-blue dark:text-blue-400"
                            )}>
                              {session.datetime.getHours()}:
                              {session.datetime.getMinutes().toString().padStart(2, "0")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {shouldShowStatusBadge(session.status) && (
                            <span
                              style={{ background: statusInfo.bg, color: statusInfo.text }}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold"
                            >
                              {statusInfo.label}
                            </span>
                          )}
                          <span
                            style={{
                              background: serviceType?.type === 'group' ? '#E3F2FD' : serviceType?.color + "15",
                              color: serviceType?.type === 'group' ? '#1a1a1a' : getReadableTextColor(serviceType?.color),
                              borderColor: serviceType?.type === 'group' ? '#2196F330' : serviceType?.color + "30"
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                          >
                            {serviceType?.name}
                          </span>
                          {session.status === "soft-hold" && session.holdExpiry && (
                            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-orange-200 dark:border-orange-800">
                              <Timer size={14} />
                              {getTimeRemaining(session.holdExpiry)}
                            </span>
                          )}
                          {client && (
                            <span
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
                                client.credits >= (serviceType?.creditsRequired || 1)
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              <CreditCard size={14} />
                              {client.credits} credits
                            </span>
                          )}
                        </div>
                      </div>

                      {/* INLINE Expanded Session Details (NO MODAL) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-wondrous-grey-light dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                          >
                            <div className="p-4 space-y-3">
                              {/* Reschedule Form - INLINE */}
                              {reschedulingSessionId === session.id ? (
                                <div className="space-y-3">
                                  <div className="text-sm font-bold text-wondrous-grey-dark dark:text-gray-100">
                                    Reschedule Session
                                  </div>

                                  {/* Date Input */}
                                  <div>
                                    <label className="text-xs font-semibold text-wondrous-grey-dark dark:text-gray-200 mb-2 flex items-center gap-1">
                                      <CalendarIcon size={14} />
                                      New Date
                                    </label>
                                    <Input
                                      type="date"
                                      value={rescheduleDate}
                                      onChange={(e) => setRescheduleDate(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>

                                  {/* Time Input */}
                                  <div>
                                    <label className="text-xs font-semibold text-wondrous-grey-dark dark:text-gray-200 mb-2 flex items-center gap-1">
                                      <Clock size={14} />
                                      New Time
                                    </label>
                                    <Input
                                      type="time"
                                      value={rescheduleTime}
                                      onChange={(e) => setRescheduleTime(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>

                                  {/* Submit Buttons */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReschedulingSessionId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-wondrous-blue hover:bg-wondrous-blue/90 text-white flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        submitReschedule(session.id);
                                      }}
                                    >
                                      <Check size={14} />
                                      Confirm Reschedule
                                    </Button>
                                  </div>
                                </div>
                              ) : completingSessionId === session.id ? (
                                <div className="space-y-3">
                                  <div className="text-sm font-bold text-wondrous-grey-dark dark:text-gray-100">
                                    Complete Session
                                  </div>

                                  {/* RPE Scale */}
                                  <div>
                                    <label className="text-xs font-semibold text-wondrous-grey-dark dark:text-gray-200 mb-2 flex items-center gap-1">
                                      <TrendingUp size={14} />
                                      RPE (Rate of Perceived Exertion)
                                    </label>
                                    <div className="flex items-center gap-2 mt-2">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
                                        <button
                                          key={rpe}
                                          onClick={() =>
                                            setCompletionData({ ...completionData, rpe })
                                          }
                                          className={cn(
                                            "w-8 h-8 rounded-lg text-xs font-bold transition-all border-2",
                                            completionData.rpe === rpe
                                              ? "bg-wondrous-blue text-white border-wondrous-blue"
                                              : "bg-white text-gray-600 border-gray-300 hover:border-wondrous-blue"
                                          )}
                                        >
                                          {rpe}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      1=Very Easy, 10=Maximum Effort
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  <div>
                                    <label className="text-xs font-semibold text-wondrous-grey-dark dark:text-gray-200 mb-2 flex items-center gap-1">
                                      <StickyNote size={14} />
                                      Session Notes
                                    </label>
                                    <textarea
                                      value={completionData.notes}
                                      onChange={(e) =>
                                        setCompletionData({
                                          ...completionData,
                                          notes: e.target.value,
                                        })
                                      }
                                      placeholder="e.g., Client showed improvement in squats, increased weight on bench press..."
                                      className="w-full p-2 border-2 border-wondrous-grey-light rounded-lg text-xs resize-none focus:outline-none focus:border-wondrous-blue"
                                      rows={3}
                                    />
                                  </div>

                                  {/* Submit Buttons */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCompletingSessionId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        submitSessionCompletion(session.id);
                                      }}
                                    >
                                      <Check size={14} />
                                      Save & Complete
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Quick Actions */}
                                  <div>
                                    <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                                      Quick Actions
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {session.status === "checked-in" ? (
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCompleteSession(session.id);
                                          }}
                                        >
                                          <Check size={14} />
                                          Complete
                                        </Button>
                                      ) : session.status === "completed" ? (
                                        <Button
                                          size="sm"
                                          className="bg-wondrous-blue hover:bg-wondrous-blue/90 flex items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickRebook(session.id);
                                          }}
                                        >
                                          <Repeat size={14} />
                                          Quick Rebook
                                        </Button>
                                      ) : isGroupClass(session.serviceTypeId ?? null) ? (
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(session.id, 'checked-in'); }}
                                          >
                                            <Check size={14} /> Check In
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(session.id, 'late'); }}
                                          >
                                            <Clock size={14} /> Late
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-300 hover:bg-red-50 flex items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(session.id, 'no-show'); }}
                                          >
                                            <X size={14} /> No Show
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          className="bg-wondrous-blue hover:bg-wondrous-blue/90 flex items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartSession(session.id);
                                          }}
                                        >
                                          <Play size={14} />
                                          Start
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (client?.phone) {
                                            window.location.href = `sms:${client.phone}`;
                                          }
                                        }}
                                      >
                                        <MessageSquare size={14} />
                                        Message
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Secondary Actions - Only for non-completed sessions and not rescheduling */}
                              {session.status !== "completed" && completingSessionId !== session.id && reschedulingSessionId !== session.id && (
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkLate(session.id);
                                  }}
                                >
                                  <AlertTriangle size={12} />
                                  Late
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNoShow(session.id);
                                  }}
                                >
                                  <UserX size={12} />
                                  No Show
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRescheduleSession(session.id);
                                  }}
                                >
                                  <CalendarX size={12} />
                                  Reschedule
                                </Button>
                              </div>
                              )}

                              {/* Cancel Button - Only for non-completed sessions and not rescheduling */}
                              {session.status !== "completed" && completingSessionId !== session.id && reschedulingSessionId !== session.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-red-600 border-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelSession(session.id);
                                }}
                              >
                                Cancel Session
                              </Button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Availability Legend - Collapsible */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-wondrous-grey-light dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="w-full p-3 text-xs font-semibold text-wondrous-grey-dark dark:text-gray-100 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-wondrous-blue dark:text-blue-400" />
                  Availability Legend
                </div>
                <ChevronRight size={14} className={cn("transition-transform", showLegend && "rotate-90")} />
              </button>
              {showLegend && (
                <div className="px-3 pb-3 flex flex-wrap gap-4 text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white dark:bg-gray-700 border-2 border-wondrous-blue dark:border-blue-400 shadow-sm"></div>
                    <span className="text-wondrous-grey-dark dark:text-gray-200 font-medium">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-red-50 border-2 border-red-300 shadow-sm"></div>
                    <span className="text-wondrous-grey-dark dark:text-gray-200 font-medium">Conflict</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gray-100 border-2 border-gray-300 opacity-50 shadow-sm"></div>
                    <span className="text-wondrous-grey-dark dark:text-gray-200 font-medium">Not Available</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Time Selector - INLINE (NO MODAL) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border-2 border-wondrous-grey-light dark:border-gray-700">
              <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-100">
                Quick Book Time
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {hours.slice(0, 12).map((hour) => {
                  const datetime = new Date(currentDate);
                  datetime.setHours(hour, 0, 0, 0);
                  const hasConflict = !isTimeAvailable(datetime, 30, sessions);
                  const isAvailable = isWithinAvailability(datetime, trainerAvailability);
                  const isPast = isTimePast(datetime);

                  return (
                    <button
                      key={hour}
                      onClick={() => !hasConflict && isAvailable && !isPast && handleQuickSlotClick(datetime)}
                      disabled={hasConflict || !isAvailable || isPast}
                      className={cn(
                        "border-2 rounded-lg p-2 text-xs font-semibold transition-all relative",
                        isPast
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500 cursor-not-allowed opacity-40 line-through"
                          : !isAvailable
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                          : hasConflict
                          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-400 dark:text-red-400 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800 border-wondrous-blue dark:border-blue-400 text-wondrous-blue dark:text-blue-400 hover:bg-wondrous-blue dark:hover:bg-blue-500 hover:text-white"
                      )}
                    >
                      {hasConflict && isAvailable && !isPast && (
                        <AlertCircle size={12} className="absolute top-0.5 right-0.5 text-red-500" />
                      )}
                      {hour}:00
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleQuickSlotClick(new Date())}
                className="w-full p-2 rounded-lg text-xs font-semibold hover:opacity-90 bg-wondrous-orange text-white flex items-center justify-center gap-2"
              >
                <Clock size={14} />
                Custom Time
              </button>
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === "week" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-2 lg:p-4 overflow-x-auto border-2 border-wondrous-grey-light dark:border-gray-700 shadow-md">
            <div className="min-w-[600px] lg:min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-8 gap-0.5 lg:gap-1 mb-2">
                <div /> {/* Empty corner */}
                {weekDates.map((date, i) => {
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={cn(
                        "text-center p-1 lg:p-2 rounded-lg text-[10px] lg:text-xs font-bold",
                        isToday
                          ? "bg-wondrous-blue text-white"
                          : "bg-wondrous-grey-light text-wondrous-grey-dark"
                      )}
                    >
                      <div className="hidden sm:block">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</div>
                      <div className="sm:hidden">{["M", "T", "W", "T", "F", "S", "S"][i]}</div>
                      <div className="text-xs lg:text-base mt-0.5">{date.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid with Sessions */}
              <div className="relative">
                {/* Background grid */}
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-0.5 lg:gap-1 h-[48px] lg:h-[64px] border-t-2 border-wondrous-grey-light dark:border-gray-700">
                    <div className="text-[10px] lg:text-xs font-medium text-right pr-1 lg:pr-2 pt-1 text-wondrous-grey-dark dark:text-gray-300">
                      {hour}:00
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                      const date = weekDates[dayIndex];
                      const slotTime = new Date(date);
                      slotTime.setHours(hour, 0, 0, 0);
                      const isBlocked = isTimeBlocked(slotTime, trainerAvailability);
                      const isAvailable = isWithinAvailability(slotTime, trainerAvailability);
                      const isPast = isTimePast(slotTime);
                      const blockLabel = isBlocked ? getBlockLabel(slotTime) : '';
                      const blockId = isBlocked ? getBlockId(slotTime) : null;
                      const isDragTarget = dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.hour === hour;

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "rounded border transition-colors relative",
                            isDragTarget && "ring-2 ring-wondrous-magenta bg-wondrous-magenta/10",
                            isPast && !isBlocked
                              ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-40"
                              : isBlocked
                              ? "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 cursor-pointer bg-[repeating-linear-gradient(45deg,_transparent,_transparent_10px,_rgba(239,68,68,0.1)_10px,_rgba(239,68,68,0.1)_20px)]"
                              : isAvailable
                              ? "bg-gray-50 dark:bg-gray-700 border-wondrous-grey-light dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer"
                              : "bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 cursor-not-allowed opacity-40"
                          )}
                          onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => {
                            if (isBlocked && blockId) {
                              setRemovingBlockId(removingBlockId === blockId ? null : blockId);
                            } else if (isAvailable && !isPast) {
                              handleQuickSlotClick(slotTime);
                            }
                          }}
                          title={isBlocked ? `${blockLabel} - Click to remove` : isPast ? "Past time" : !isAvailable ? "Trainer not available" : "Click to book"}
                        >
                          {isBlocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[8px] lg:text-[10px] font-semibold text-red-600 dark:text-red-400 bg-white/80 dark:bg-gray-900/80 px-1 rounded truncate max-w-full">
                                {blockLabel}
                              </span>
                            </div>
                          )}
                          {removingBlockId === blockId && blockId && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 rounded">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveBlock(blockId, slotTime); }}
                                className="text-[8px] lg:text-[10px] font-bold text-red-600 hover:text-red-700 px-1"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Positioned Sessions */}
                {weekDates.map((date, dayIndex) => {
                  const daySessions = weekSessions.filter((s) => {
                    const sessionDate = new Date(s.datetime);
                    return (
                      sessionDate.getFullYear() === date.getFullYear() &&
                      sessionDate.getMonth() === date.getMonth() &&
                      sessionDate.getDate() === date.getDate()
                    );
                  });

                  return daySessions.map((session) => {
                    const serviceType = getServiceType(session.serviceTypeId);
                    const client = clients.find((c) => c.id === session.clientId);
                    const statusInfo = getStatusBadge(session.status);

                    if (!serviceType) return null;

                    // Calculate position using fractional hour offset
                    const sessionHour = session.datetime.getHours();
                    const sessionMinute = session.datetime.getMinutes();
                    const hourOffset = (sessionHour - 6) + sessionMinute / 60;
                    const sessionDuration = serviceType.duration || (session as { duration?: number }).duration || 30;
                    const durationHours = sessionDuration / 60;

                    // Calculate left position (column)
                    const columnWidth = 100 / 8; // 8 columns total
                    const leftPosition = (dayIndex + 1) * columnWidth; // +1 to skip time label column
                    const groupOverride = getGroupColorOverride(serviceType);
                    const cardBg = session.status === "soft-hold"
                      ? "rgba(245, 158, 11, 0.15)"
                      : groupOverride
                        ? groupOverride.bg + "30"
                        : serviceType.color + "20";
                    const cardBorder = session.status === "soft-hold"
                      ? undefined
                      : groupOverride
                        ? groupOverride.border
                        : serviceType.color;

                    return (
                      <div
                        key={session.id}
                        draggable={session.status !== 'cancelled'}
                        onDragStart={(e) => handleDragStart(e, session.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "absolute rounded-md lg:rounded-lg shadow-sm p-1 lg:p-2 hover:shadow-md transition-all cursor-pointer overflow-hidden",
                          session.status === "soft-hold"
                            ? "border-2 border-dashed border-amber-400 dark:border-amber-600"
                            : "border lg:border-2",
                          draggedSessionId === session.id && "opacity-50"
                        )}
                        style={{
                          top: `${hourOffset * hourHeight}px`,
                          left: `calc(${leftPosition}% + 2px)`,
                          width: `calc(${columnWidth}% - 4px)`,
                          height: `${durationHours * hourHeight}px`,
                          minHeight: "24px",
                          background: cardBg,
                          borderColor: cardBorder,
                        }}
                        onClick={() => { if (!draggedSessionId) handleSessionClick(session.id); }}
                      >
                        <div className="flex flex-col h-full justify-between text-xs lg:text-sm">
                          <div>
                            <div className="font-bold truncate text-[10px] lg:text-sm text-gray-900 dark:text-gray-100">
                              <span className="hidden md:inline">{formatTime(session.datetime)} - {session.clientName}</span>
                              <span className="md:hidden">{client?.initials}</span>
                            </div>
                            <div className="text-[9px] lg:text-xs text-gray-700 dark:text-gray-300 hidden sm:block">
                              {serviceType.name}
                            </div>
                          </div>
                          {shouldShowStatusBadge(session.status) && (
                            <div
                              className="text-[9px] lg:text-xs font-semibold px-1 lg:px-1.5 py-0.5 rounded self-start hidden sm:block"
                              style={{
                                background: session.status === "soft-hold" ? "#fef3c7" : statusInfo.bg,
                                color: session.status === "soft-hold" ? "#92400e" : statusInfo.text,
                              }}
                            >
                              {session.status === "soft-hold" ? "Hold" : statusInfo.label}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* REQUESTS TAB */}
        {calendarTab === "requests" && (
          <div className="space-y-3">
            {/* Pending Requests */}
            <div>
              <h3 className="text-base font-bold text-wondrous-grey-dark dark:text-gray-100 mb-3 flex items-center gap-2">
                <Inbox size={20} className="text-wondrous-orange" />
                Pending Requests ({bookingRequests.filter((r) => r.status === "pending").length})
              </h3>

              {bookingRequests.filter((r) => r.status === "pending").length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-wondrous-grey-light dark:border-gray-700">
                  <Inbox size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <div className="text-sm font-medium dark:text-gray-200">No pending requests</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    All caught up!
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingRequests
                    .filter((r) => r.status === "pending")
                    .map((request) => {
                      const serviceType = getServiceType(request.serviceId);
                      if (!serviceType) return null;

                      return (
                        <div
                          key={request.id}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-wondrous-grey-light dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
                        >
                          {/* Client Info */}
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              style={{ background: serviceType.color }}
                              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
                            >
                              <User size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-base text-wondrous-grey-dark dark:text-gray-100">
                                {request.clientName ?? "Client"}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {request.client?.credits ?? 0} credits available
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.floor(
                                  (Date.now() - new Date(request.createdAt).getTime()) /
                                    (1000 * 60 * 60)
                                )}
                                h ago
                              </div>
                            </div>
                          </div>

                          {/* Service Type */}
                          <div
                            className="mb-3 p-2 rounded-lg"
                            style={{ background: serviceType.color + "20" }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div
                                  className="font-semibold text-sm"
                                  style={{ color: serviceType.type === 'group' ? '#1a1a1a' : getReadableTextColor(serviceType.color) }}
                                >
                                  {serviceType.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {serviceType.duration} minutes •{" "}
                                  {serviceType.creditsRequired} credits
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          {request.notes && (
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-wondrous-grey-light dark:border-gray-600">
                              <div className="flex items-start gap-2">
                                <MessageSquare size={14} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-gray-700 dark:text-gray-300">{request.notes}</div>
                              </div>
                            </div>
                          )}

                          {/* Preferred Times */}
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-wondrous-grey-dark dark:text-gray-200 mb-2">
                              Preferred Times
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {request.preferredTimes.map((time, index) => {
                                const timeDate = new Date(time);
                                const available = isTimeAvailable(
                                  timeDate,
                                  serviceType.duration,
                                  sessions
                                );

                                return (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      if (available) {
                                        handleAcceptRequest(request.id, timeDate);
                                      }
                                    }}
                                    disabled={!available}
                                    className={cn(
                                      "p-2 rounded-lg text-xs font-semibold transition-all border-2",
                                      available
                                        ? "bg-white dark:bg-gray-800 border-wondrous-blue dark:border-blue-400 text-wondrous-blue dark:text-blue-400 hover:bg-wondrous-blue dark:hover:bg-blue-500 hover:text-white"
                                        : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                    )}
                                  >
                                    <div>{formatDate(timeDate)}</div>
                                    <div className="font-bold">{formatTime(timeDate)}</div>
                                    {!available && (
                                      <div className="text-[10px] text-red-500">Conflict</div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-3 gap-2">
                            {(() => {
                              const firstAvailableTime = request.preferredTimes
                                .map((t: string) => new Date(t))
                                .find((t: Date) => isTimeAvailable(t, serviceType.duration, sessions));
                              return (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={!firstAvailableTime}
                                  onClick={() => {
                                    if (firstAvailableTime) {
                                      handleAcceptRequest(request.id, firstAvailableTime);
                                    }
                                  }}
                                >
                                  <CheckCircle size={16} className="mr-1" />
                                  Accept
                                </Button>
                              );
                            })()}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleDeclineRequest(request.id)}
                            >
                              <XCircle size={16} className="mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-wondrous-blue dark:text-blue-400 border-wondrous-blue dark:border-blue-400 hover:bg-wondrous-blue dark:hover:bg-blue-500 hover:text-white"
                              onClick={() => {
                                toast({
                                  title: "Suggest Alternative",
                                  description: "Feature coming soon",
                                });
                              }}
                            >
                              <Clock size={16} className="mr-1" />
                              Suggest Alt
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* INLINE Booking Panel (NO MODAL) */}
      <AnimatePresence>
        {showBookingPanel && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl border-t-4 border-wondrous-magenta lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] lg:max-w-[90vw] lg:bottom-4 lg:rounded-3xl max-h-[90vh] lg:max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-wondrous-grey-dark dark:text-gray-100">
                    Book Session
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      const st = services.find(s => s.id === selectedServiceType);
                      const parts: string[] = [];
                      if (st) parts.push(st.name);
                      if (selectedSlot) parts.push(formatDate(selectedSlot));
                      if (selectedSlot) parts.push(formatTime(selectedSlot));
                      return parts.join(' · ') || 'Select a time';
                    })()}
                  </p>
                </div>
                <button
                  onClick={closeBookingPanel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={24} className="dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 pt-4">
              {/* Service Type Selection - INLINE */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                  Session Type
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedServiceType(service.id)}
                      style={{
                        background:
                          selectedServiceType === service.id
                            ? service.color
                            : "#F5F5F5",
                        color:
                          selectedServiceType === service.id
                            ? "white"
                            : "#272030",
                        borderColor:
                          selectedServiceType === service.id
                            ? service.color
                            : "#D7D7DB",
                      }}
                      className="border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">
                            {service.name}
                          </div>
                          <div className="text-xs opacity-75">
                            {service.duration} minutes • {service.creditsRequired}{" "}
                            credits
                          </div>
                        </div>
                        {selectedServiceType === service.id && (
                          <CheckCircle size={20} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workout Template Selection - OPTIONAL */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                  Workout Template <span className="text-gray-400 font-normal">(Optional)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedTemplateId(null);
                      setSelectedSignOffMode(null);
                    }}
                    className={cn(
                      "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                      !selectedTemplateId
                        ? "bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        No Template - Set Later
                      </div>
                      {!selectedTemplateId && (
                        <CheckCircle size={20} className="text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                  </button>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                        selectedTemplateId === template.id
                          ? "bg-wondrous-magenta border-wondrous-magenta text-white"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={cn(
                            "font-semibold text-sm",
                            selectedTemplateId === template.id
                              ? "text-white"
                              : "text-gray-900 dark:text-gray-100"
                          )}>
                            {template.name}
                          </div>
                          <div className={cn(
                            "text-xs",
                            selectedTemplateId === template.id
                              ? "text-white/80"
                              : "text-gray-600 dark:text-gray-400"
                          )}>
                            {template.blocks.length} blocks • {template.type === 'resistance_only' ? 'Resistance Only' : 'Standard'}
                          </div>
                        </div>
                        {selectedTemplateId === template.id && (
                          <CheckCircle size={20} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign-Off Mode Selection - Only if template selected */}
              {selectedTemplateId && (
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                    Sign-Off Mode
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { value: 'per_exercise', label: 'Per Exercise', desc: 'Sign off after each exercise' },
                      { value: 'per_block', label: 'Per Block', desc: 'Sign off after each block' },
                      { value: 'full_session', label: 'Full Session', desc: 'Sign off at the end' },
                    ] as const).map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setSelectedSignOffMode(mode.value)}
                        className={cn(
                          "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                          selectedSignOffMode === mode.value
                            ? "bg-wondrous-blue border-wondrous-blue text-white"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={cn(
                              "font-semibold text-sm",
                              selectedSignOffMode === mode.value
                                ? "text-white"
                                : "text-gray-900 dark:text-gray-100"
                            )}>
                              {mode.label}
                            </div>
                            <div className={cn(
                              "text-xs",
                              selectedSignOffMode === mode.value
                                ? "text-white/80"
                                : "text-gray-600 dark:text-gray-400"
                            )}>
                              {mode.desc}
                            </div>
                          </div>
                          {selectedSignOffMode === mode.value && (
                            <CheckCircle size={20} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Search - INLINE */}
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="border-2 border-wondrous-grey-light pl-10"
                />
              </div>

              {/* Client Selection Label */}
              <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200 uppercase tracking-wide">
                Select Client
              </div>

              {/* Client List - Selectable Rows */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredClients.map((client) => {
                  const serviceType = services.find(
                    (s) => s.id === selectedServiceType
                  );
                  const hasEnoughCredits =
                    serviceType && client.credits >= serviceType.creditsRequired;
                  const isSelected = selectedBookingClient === client.id;

                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedBookingClient(client.id)}
                      className={cn(
                        "w-full bg-white dark:bg-gray-700 border-2 rounded-xl p-3 text-left transition-all",
                        isSelected
                          ? "border-wondrous-magenta bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ background: client.color }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
                        >
                          {client.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-wondrous-grey-dark dark:text-gray-100">
                            {client.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <span className={hasEnoughCredits ? "text-green-600" : "text-red-600"}>
                              {client.credits} credit{client.credits !== 1 ? 's' : ''}
                              {serviceType && ` · needs ${serviceType.creditsRequired}`}
                              {!hasEnoughCredits && serviceType && (
                                <> · <span className="inline-flex items-center gap-0.5"><AlertTriangle size={11} className="inline" /> insufficient</span></>
                              )}
                            </span>
                          </div>
                        </div>
                        {!hasEnoughCredits && serviceType && (
                          <span className="text-xs text-red-500 font-medium whitespace-nowrap">Soft hold</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fixed Footer with Book Button */}
            <div className="flex-shrink-0 p-5 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Button
                className="w-full bg-gradient-to-r from-[#A71075] to-[#6B21A8] hover:from-[#8a0d60] hover:to-[#5a1b8a] text-white text-base py-5"
                disabled={!selectedBookingClient || !selectedServiceType || !selectedSlot}
                onClick={() => {
                  if (!selectedSlot || !selectedServiceType || !selectedBookingClient) return;
                  const client = filteredClients.find(c => c.id === selectedBookingClient);
                  if (!client) return;
                  const serviceType = services.find(s => s.id === selectedServiceType);
                  const hasEnoughCredits = serviceType && client.credits >= serviceType.creditsRequired;

                  if (hasEnoughCredits) {
                    handleCreateBooking(client.id, selectedServiceType, selectedSlot);
                  } else {
                    // Auto soft-hold + auto send top-up email
                    const holdExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    const newSession: CalendarSession = {
                      id: `session_${Date.now()}`,
                      datetime: selectedSlot,
                      clientId: client.id,
                      clientName: client.name,
                      clientColor: client.color,
                      clientCredits: client.credits,
                      status: "soft-hold",
                      serviceTypeId: selectedServiceType,
                      workoutId: null,
                      holdExpiry: holdExpiry,
                    };
                    addSessionMutation.mutate(newSession);

                    // Auto-send soft hold email
                    fetch('/api/email/soft-hold', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        clientId: client.id,
                        clientName: client.name,
                        sessionDatetime: selectedSlot.toISOString(),
                        serviceTypeName: serviceType?.name,
                        creditsRequired: serviceType?.creditsRequired,
                        holdExpiry: holdExpiry.toISOString(),
                      }),
                    }).catch(() => {});

                    toast({
                      title: "Soft Hold + Top-Up Email Sent",
                      description: `Hold expires in 24h • Top-up email sent to ${client.name}`,
                    });
                    closeBookingPanel();
                  }
                }}
              >
                Book
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INLINE Session Setup Panel (NO MODAL) */}
      <AnimatePresence>
        {showSessionSetupPanel && setupSessionId && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl border-t-4 border-wondrous-primary lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] lg:max-w-[90vw] lg:bottom-4 lg:rounded-3xl max-h-[90vh] lg:max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-wondrous-grey-dark dark:text-gray-100">
                    Setup Session
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a template (optional) and sign-off mode
                  </p>
                </div>
                <button
                  onClick={closeSessionSetupPanel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 pt-4">
              {/* Workout Template Selection - OPTIONAL */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                  Workout Template <span className="text-gray-400">(optional)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSetupTemplateId(template.id)}
                      className={cn(
                        "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                        setupTemplateId === template.id
                          ? "bg-wondrous-magenta border-wondrous-magenta text-white"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={cn(
                            "font-semibold text-sm",
                            setupTemplateId === template.id
                              ? "text-white"
                              : "text-gray-900 dark:text-gray-100"
                          )}>
                            {template.name}
                          </div>
                          <div className={cn(
                            "text-xs",
                            setupTemplateId === template.id
                              ? "text-white/80"
                              : "text-gray-600 dark:text-gray-400"
                          )}>
                            {template.blocks.length} blocks • {template.type === 'resistance_only' ? 'Resistance Only' : 'Standard'}
                          </div>
                        </div>
                        {setupTemplateId === template.id && (
                          <CheckCircle size={20} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign-Off Mode Selection - REQUIRED */}
              {setupTemplateId && (
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                    Sign-Off Mode <span className="text-red-500">*</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { value: 'per_exercise' as const, label: 'Per Exercise', desc: 'Sign off after each exercise' },
                      { value: 'per_block' as const, label: 'Per Block', desc: 'Sign off after each block' },
                      { value: 'full_session' as const, label: 'Full Session', desc: 'Sign off at the end' },
                    ]).map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setSetupSignOffMode(mode.value)}
                        className={cn(
                          "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                          setupSignOffMode === mode.value
                            ? "bg-wondrous-blue border-wondrous-blue text-white"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={cn(
                              "font-semibold text-sm",
                              setupSignOffMode === mode.value
                                ? "text-white"
                                : "text-gray-900 dark:text-gray-100"
                            )}>
                              {mode.label}
                            </div>
                            <div className={cn(
                              "text-xs",
                              setupSignOffMode === mode.value
                                ? "text-white/80"
                                : "text-gray-600 dark:text-gray-400"
                            )}>
                              {mode.desc}
                            </div>
                          </div>
                          {setupSignOffMode === mode.value && (
                            <CheckCircle size={20} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="flex-shrink-0 p-5 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeSessionSetupPanel}
                >
                  Cancel
                </Button>
                {setupTemplateId ? (
                  <Button
                    className="flex-1 bg-wondrous-primary hover:bg-wondrous-primary/90"
                    onClick={confirmSessionSetup}
                    disabled={!setupSignOffMode}
                  >
                    Start Session
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      // Start session without template
                      const session = sessions.find((s) => s.id === setupSessionId);
                      if (session) {
                        updateSessionMutation.mutate(setupSessionId!, { status: 'checked-in' });
                        toast({ title: 'Session Started', description: `${session.clientName}'s session started without template` });
                        closeSessionSetupPanel();
                      }
                    }}
                  >
                    Start Without Template
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INLINE Block Time Panel (NO MODAL) */}
      <AnimatePresence>
        {showBlockTimePanel && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl border-t-4 border-wondrous-magenta lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] lg:max-w-[90vw] lg:bottom-4 lg:rounded-3xl max-h-[90vh] lg:max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-5 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-wondrous-grey-dark dark:text-gray-100">
                    Block Time
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mark time as unavailable
                  </p>
                </div>
                <button
                  onClick={closeBlockTimePanel}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 pt-4">
              {/* Recurrence Type Selection */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                  Recurrence Type
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBlockRecurrence('once')}
                    className={cn(
                      "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                      blockRecurrence === 'once'
                        ? "bg-wondrous-magenta border-wondrous-magenta text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">One-Time</div>
                      {blockRecurrence === 'once' && <CheckCircle size={20} />}
                    </div>
                  </button>
                  <button
                    onClick={() => setBlockRecurrence('weekly')}
                    className={cn(
                      "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                      blockRecurrence === 'weekly'
                        ? "bg-wondrous-magenta border-wondrous-magenta text-white"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">Weekly</div>
                      {blockRecurrence === 'weekly' && <CheckCircle size={20} />}
                    </div>
                  </button>
                </div>
              </div>

              {/* One-Time: Date Selection */}
              {blockRecurrence === 'once' && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-semibold mb-2 block text-wondrous-grey-dark dark:text-gray-200">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="border-2 border-wondrous-grey-light"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold mb-2 block text-wondrous-grey-dark dark:text-gray-200">
                      End Date <span className="text-gray-400 font-normal">(Optional - for multi-day blocks)</span>
                    </label>
                    <Input
                      type="date"
                      value={blockEndDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                      className="border-2 border-wondrous-grey-light"
                      min={blockDate}
                    />
                  </div>
                </>
              )}

              {/* Weekly: Day of Week Selection (Multi-Select) */}
              {blockRecurrence === 'weekly' && (
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                    Days of Week <span className="text-gray-400 font-normal">(select multiple)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' },
                      { value: 0, label: 'Sun' },
                    ].map((day) => (
                      <button
                        key={day.value}
                        onClick={() => setBlockDaysOfWeek((prev) =>
                          prev.includes(day.value)
                            ? prev.filter((d) => d !== day.value)
                            : [...prev, day.value]
                        )}
                        className={cn(
                          "border-2 rounded-lg p-2 text-xs font-semibold hover:opacity-90 transition-all",
                          blockDaysOfWeek.includes(day.value)
                            ? "bg-wondrous-magenta border-wondrous-magenta text-white"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Range */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-2 block text-wondrous-grey-dark dark:text-gray-200">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
                      className="border-2 border-wondrous-grey-light"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-2 block text-wondrous-grey-dark dark:text-gray-200">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                      className="border-2 border-wondrous-grey-light"
                    />
                  </div>
                </div>
              </div>

              {/* Reason Selection */}
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-wondrous-grey-dark dark:text-gray-200">
                  Reason
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'personal', label: 'Personal' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'break', label: 'Break' },
                  ] as const).map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setBlockReason(reason.value)}
                      className={cn(
                        "border-2 rounded-xl p-3 text-left hover:opacity-90 transition-all",
                        blockReason === reason.value
                          ? "bg-slate-600 border-slate-600 text-white"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">{reason.label}</div>
                        {blockReason === reason.value && <CheckCircle size={20} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block text-wondrous-grey-dark dark:text-gray-200">
                  Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  placeholder="e.g., Doctor appointment, Team meeting..."
                  className="border-2 border-wondrous-grey-light"
                />
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="flex-shrink-0 p-5 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex gap-2">
                <Button
                  onClick={closeBlockTimePanel}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={handleCreateBlock}
                  className="flex-1 bg-wondrous-magenta hover:bg-wondrous-magenta-alt"
                >
                  Block Time
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Reschedule Confirmation Dialog */}
      {pendingReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-wondrous-blue/10 flex items-center justify-center">
                <CalendarIcon size={24} className="text-wondrous-blue" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm Reschedule?</h3>
            </div>
            <div className="space-y-2 mb-6 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-semibold">{pendingReschedule.session.clientName}</span>&apos;s session</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">From:</span>
                <span>{formatDate(pendingReschedule.oldDatetime)} at {formatTime(pendingReschedule.oldDatetime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">To:</span>
                <span className="font-semibold text-wondrous-blue">{formatDate(pendingReschedule.targetDate)} at {formatTime(pendingReschedule.targetDate)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelReschedule}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-wondrous-blue hover:bg-wondrous-dark-blue text-white"
                onClick={confirmReschedule}
                disabled={isRescheduling}
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Block Deletion Dialog */}
      {deleteBlockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                <Repeat size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Remove Recurring Block</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This is a weekly recurring block</p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleRemoveSingleOccurrence}
              >
                Remove this occurrence only
              </Button>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRemoveAllOccurrences}
              >
                Remove all occurrences
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDeleteBlockDialog(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Context-Aware Floating Action Button */}
      <div className="fixed bottom-24 right-6 lg:bottom-6 flex flex-col gap-3 z-30">
        {/* Primary Action - Context aware based on day state */}
        <div className="relative">
          {todaysSessions.length === 0 ? (
            // Empty day: Primary action is to block time
            <button
              onClick={openBlockTimePanel}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white shadow-lg hover:shadow-xl hover:from-wondrous-dark-blue hover:to-wondrous-primary-hover transition-all flex items-center justify-center"
              aria-label="Block Time"
              title="Block Time"
            >
              <Clock size={24} />
            </button>
          ) : (
            // Busy day: Primary action is to block time
            <button
              onClick={openBlockTimePanel}
              className="w-14 h-14 rounded-full bg-slate-600 dark:bg-slate-500 text-white shadow-lg hover:shadow-xl hover:bg-slate-700 dark:hover:bg-slate-400 transition-all flex items-center justify-center"
              aria-label="Block Time"
              title="Block Time"
            >
              <CalendarX size={24} />
            </button>
          )}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Block Time
          </span>
        </div>
      </div>
    </div>
  );
}
