import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";

const ICON_PATH =
  "M82.151,17.987C94.465,12.808 107.691,10.14 121.05,10.14C176.095,10.14 221.39,55.435 221.39,110.48C221.39,165.525 176.095,210.82 121.05,210.82C67.465,210.82 22.851,167.895 20.785,114.349L60.555,112.815C61.802,145.122 88.719,171.02 121.05,171.02C154.261,171.02 181.59,143.692 181.59,110.48C181.59,77.269 154.261,49.94 121.05,49.94C112.99,49.94 105.01,51.55 97.58,54.675L82.151,17.987Z M74.71,58.84C74.71,77.261 59.551,92.42 41.13,92.42C22.709,92.42 7.55,77.261 7.55,58.84C7.55,40.419 22.709,25.26 41.13,25.26C59.551,25.26 74.71,40.419 74.71,58.84Z";

const LETTER_R1 =
  "M112,0L364,0L364,598C364,763 457,846 577,846C627,846 677,841 696,838L696,1062C676,1064 648,1066 614,1066C478,1066 397,1002 358,881L355,881L355,1056L112,1056L112,0Z";
const LETTER_K =
  "M112,0L364,0L364,353L460,452L806,0L1107,0L652,600L1081,1056L778,1056L367,628L364,628L364,1490L112,1490L112,0Z";
const LETTER_E =
  "M578,-24C825,-24 1021,119 1061,326L825,326C796,236 711,175 584,175C414,175 316,290 310,462L1074,462L1074,531C1074,855 872,1080 568,1080C272,1080 63,848 63,527C63,207 261,-24 578,-24ZM312,636C329,787 426,880 572,880C718,880 816,787 832,636L312,636Z";
const LETTER_S =
  "M526,-25C787,-25 974,105 974,311C974,466 877,558 668,602L478,641C390,660 338,699 338,762C338,834 406,890 517,890C632,890 709,821 711,727L948,727C942,944 767,1079 511,1079C253,1079 86,948 86,754C86,594 192,491 394,449L574,412C663,393 718,356 718,292C718,217 644,164 522,164C396,164 322,223 311,326L62,326C78,99 269,-25 526,-25Z";
const LETTER_T =
  "M669,1056L454,1056L454,1344L201,1344L201,1056L17,1056L17,853L201,853L201,266C201,85 302,0 517,0L669,0L669,203L561,203C479,203 454,228 454,303L454,853L669,853L669,1056Z";
const LETTER_R2 = LETTER_R1;
const LETTER_Y =
  "M131,-418L296,-418C449,-418 553,-339 616,-174L1088,1056L824,1056L631,506C604,428 579,350 555,272C531,350 505,428 479,506L285,1056L18,1056L425,6L386,-96C356,-179 324,-213 256,-213L131,-213L131,-418Z";
const LETTER_A =
  "M434,-17C606,-17 695,55 745,149L749,149L749,0L997,0L997,720C997,940 834,1077 559,1077C283,1077 111,938 99,728L342,728C349,817 431,881 554,881C675,881 747,817 747,727L747,719C747,647 680,644 484,622C266,599 69,540 69,300C69,89 224,-17 434,-17ZM496,170C386,170 315,219 315,302C315,398 407,437 515,453C619,469 717,485 748,505L748,391C748,268 661,170 496,170Z";

function IconGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(38.491268,200.68,-200.68,38.491268,7.55,10.139994)">
      <stop offset="0" stopColor="rgb(253,178,41)" />
      <stop offset="0.55" stopColor="rgb(251,166,31)" />
      <stop offset="1" stopColor="rgb(250,154,24)" />
    </linearGradient>
  );
}

function KGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(179.1,1490,-1490,179.1,112,0)">
      <stop offset="0" stopColor="rgb(253,178,41)" />
      <stop offset="0.55" stopColor="rgb(251,166,31)" />
      <stop offset="1" stopColor="rgb(250,154,24)" />
    </linearGradient>
  );
}

function OrkestryaIcon({ className }: { className?: string }) {
  const iconId = `icon-${useId()}`;
  return (
    <svg viewBox="0 0 225 215" className={className} xmlns="http://www.w3.org/2000/svg" style={{ fillRule: "evenodd", clipRule: "evenodd" }}>
      <defs>
        <IconGradient id={iconId} />
      </defs>
      <path d={ICON_PATH} fill={`url(#${iconId})`} />
    </svg>
  );
}

function OrkestryaWordmark({ className }: { className?: string }) {
  const uid = useId();
  const iconId = `icon-${uid}`;
  const kId = `k-${uid}`;
  return (
    <svg viewBox="0 0 1085 266" className={className} xmlns="http://www.w3.org/2000/svg" style={{ fillRule: "evenodd", clipRule: "evenodd" }}>
      <defs>
        <IconGradient id={iconId} />
        <KGradient id={kId} />
      </defs>
      <path d={ICON_PATH} fill={`url(#${iconId})`} />
      <g transform="matrix(0.112305,0,0,-0.112305,246,205)">
        <path d={LETTER_R1} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,324.16,205)">
        <path d={LETTER_K} fill={`url(#${kId})`} />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,444.22,205)">
        <path d={LETTER_E} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,568.2,205)">
        <path d={LETTER_S} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,680.84,205)">
        <path d={LETTER_T} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,757.32,205)">
        <path d={LETTER_R2} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,835.94,205)">
        <path d={LETTER_Y} fill="currentColor" />
      </g>
      <g transform="matrix(0.112305,0,0,-0.112305,956.89,205)">
        <path d={LETTER_A} fill="currentColor" />
      </g>
    </svg>
  );
}

function LogoMark({ compact, size }: { compact: boolean; size: "sm" | "lg" }) {
  if (compact) {
    return (
      <OrkestryaIcon
        className={cn("text-accent flex-shrink-0", size === "lg" ? "h-11 w-auto" : "h-7 w-auto")}
      />
    );
  }
  return (
    <OrkestryaWordmark
      className={cn("text-ink flex-shrink-0", size === "lg" ? "h-9 w-auto" : "h-7 w-auto")}
    />
  );
}

export function Logo({
  compact = false,
  size = "sm",
  href,
  onClick,
}: {
  compact?: boolean;
  size?: "sm" | "lg";
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className="cursor-pointer">
        <LogoMark compact={compact} size={size} />
      </Link>
    );
  }
  return <LogoMark compact={compact} size={size} />;
}
