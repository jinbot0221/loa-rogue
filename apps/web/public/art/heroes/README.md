# 허가 원본 기반 SD 아트 적용 대기

아직 사용자 원본 이미지가 첨부되지 않았으므로 이 폴더에는 캐릭터 이미지가 없다.
원본을 받으면 이미지 생성/편집 도구로 SD 변환하고, 투명 배경 WebP/PNG를 영웅ID별로 저장한다.
예: wei.webp, nineveh.webp, thirain.webp, shandi.webp, azena_inanna.webp, balthorr.webp.
`src/art/heroes.ts`에 경로와 제공된 출처/표기/허용 범위를 기록하면 로비와 전투가 해당 이미지를 사용한다.
이미지가 없거나 로드에 실패하면 기존 자체 플레이스홀더를 사용한다.
원본 자체는 배포에 필요한 경우가 아니면 이 공개 폴더에 보관하지 않는다.
