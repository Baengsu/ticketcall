// components/icons/NicknameIcon.tsx

interface NicknameIconProps {
  iconKey: string | null | undefined;
  source?: string | null;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * 닉네임 아이콘 렌더링 컴포넌트
 * 
 * custom 소스이고 iconKey가 phoenix_stage_로 시작하는 경우 SVG 파일을 렌더링합니다.
 */
export default function NicknameIcon({
  iconKey,
  source = "custom",
  className = "",
  width = 16,
  height = 16,
}: NicknameIconProps) {
  // iconKey가 없으면 렌더링하지 않음
  if (!iconKey) {
    return null;
  }

  // custom 소스이고 phoenix_stage_로 시작하는 경우에만 렌더링
  if (source === "custom" && iconKey.startsWith("phoenix_stage_")) {
    return (
      <img
        src={`/icons/custom/phoenix/${iconKey}.svg`}
        width={width}
        height={height}
        alt=""
        className={className}
      />
    );
  }

  // 다른 소스나 패턴은 나중에 확장 가능
  return null;
}

