import {
  Archive,
  ArrowUp,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock3,
  ComputerTerminal01Icon,
  Database,
  FileText,
  FolderPlus,
  GitBranch,
  Globe,
  HardDrive,
  Loader,
  LockKeyhole,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Plug2,
  Plus,
  Search,
  Server,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";

type DesktopIconProps = Omit<HugeiconsIconProps, "icon">;

function createDesktopIcon(icon: IconSvgElement, displayName: string) {
  function DesktopIcon({ size = 16, strokeWidth = 1.8, ...props }: DesktopIconProps) {
    return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} {...props} />;
  }

  DesktopIcon.displayName = displayName;
  return DesktopIcon;
}

const ArchiveIcon = createDesktopIcon(Archive, "Archive");
const ArrowUpIcon = createDesktopIcon(ArrowUp, "ArrowUp");
const BotIcon = createDesktopIcon(Bot, "Bot");
const BrainIcon = createDesktopIcon(Brain, "Brain");
const CheckIcon = createDesktopIcon(Check, "CheckIcon");
const ChevronDownIcon = createDesktopIcon(ChevronDown, "ChevronDownIcon");
const ChevronRightIcon = createDesktopIcon(ChevronRight, "ChevronRightIcon");
const ChevronUpIcon = createDesktopIcon(ChevronUp, "ChevronUpIcon");
const CircleAlertIcon = createDesktopIcon(CircleAlert, "CircleAlert");
const Clock3Icon = createDesktopIcon(Clock3, "Clock3");
const DatabaseIcon = createDesktopIcon(Database, "Database");
const FileTextIcon = createDesktopIcon(FileText, "FileText");
const FolderPlusIcon = createDesktopIcon(FolderPlus, "FolderPlus");
const GitBranchIcon = createDesktopIcon(GitBranch, "GitBranch");
const GlobeIcon = createDesktopIcon(Globe, "Globe");
const HardDriveIcon = createDesktopIcon(HardDrive, "HardDrive");
const Loader2Icon = createDesktopIcon(Loader, "Loader2Icon");
const LockKeyholeIcon = createDesktopIcon(LockKeyhole, "LockKeyhole");
const MessageSquareIcon = createDesktopIcon(MessageSquare, "MessageSquare");
const MessageSquarePlusIcon = createDesktopIcon(MessageSquarePlus, "MessageSquarePlus");
const PanelLeftCloseIcon = createDesktopIcon(PanelLeftClose, "PanelLeftClose");
const PanelLeftOpenIcon = createDesktopIcon(PanelLeftOpen, "PanelLeftOpen");
const PanelRightCloseIcon = createDesktopIcon(PanelRightClose, "PanelRightClose");
const PanelRightOpenIcon = createDesktopIcon(PanelRightOpen, "PanelRightOpen");
const PinIcon = createDesktopIcon(Pin, "Pin");
const Plug2Icon = createDesktopIcon(Plug2, "Plug2");
const PlusIcon = createDesktopIcon(Plus, "Plus");
const SearchIcon = createDesktopIcon(Search, "Search");
const ServerIcon = createDesktopIcon(Server, "Server");
const Settings2Icon = createDesktopIcon(Settings2, "Settings2");
const ShieldIcon = createDesktopIcon(Shield, "Shield");
const SlidersHorizontalIcon = createDesktopIcon(SlidersHorizontal, "SlidersHorizontal");
const SparklesIcon = createDesktopIcon(Sparkles, "Sparkles");
const SquareTerminalIcon = createDesktopIcon(ComputerTerminal01Icon, "SquareTerminal");
const WrenchIcon = createDesktopIcon(Wrench, "Wrench");
const XIcon = createDesktopIcon(X, "XIcon");

export {
  ArchiveIcon as Archive,
  ArrowUpIcon as ArrowUp,
  BotIcon as Bot,
  BrainIcon as Brain,
  CheckIcon,
  CheckIcon as Check,
  ChevronDownIcon,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon,
  ChevronRightIcon as ChevronRight,
  ChevronUpIcon,
  CircleAlertIcon as CircleAlert,
  Clock3Icon as Clock3,
  DatabaseIcon as Database,
  FileTextIcon as FileText,
  FolderPlusIcon as FolderPlus,
  GitBranchIcon as GitBranch,
  GlobeIcon as Globe,
  HardDriveIcon as HardDrive,
  Loader2Icon,
  LockKeyholeIcon as LockKeyhole,
  MessageSquareIcon as MessageSquare,
  MessageSquarePlusIcon as MessageSquarePlus,
  PanelLeftCloseIcon as PanelLeftClose,
  PanelLeftOpenIcon as PanelLeftOpen,
  PanelRightCloseIcon as PanelRightClose,
  PanelRightOpenIcon as PanelRightOpen,
  PinIcon as Pin,
  Plug2Icon as Plug2,
  PlusIcon as Plus,
  SearchIcon as Search,
  ServerIcon as Server,
  Settings2Icon as Settings2,
  ShieldIcon as Shield,
  SlidersHorizontalIcon as SlidersHorizontal,
  SparklesIcon as Sparkles,
  SquareTerminalIcon as SquareTerminal,
  WrenchIcon as Wrench,
  XIcon,
  XIcon as X,
};
