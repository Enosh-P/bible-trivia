import type { ReactNode } from 'react';
import { C, Ground, INK, Person as P, Waves, line } from './kit';
import type { PersonProps } from './kit';
import { AltarSm, Animal, Bird, Camel, Coins, Earth, Hills, Light, Night, Oak, Palm, Sack, StarPt, Stick, SwordSm, TentSm, Town, WellSm } from './sceneKit';
import type { AnimalKind } from './sceneKit';

/*
 * Scene pictures, part 1 (Genesis 1–31 and the Gospels): each one shows the event of its question
 * with people doing the action. Built from the figure kit in kit.tsx and the props in sceneKit.tsx.
 * God is never drawn: His presence is a plain disc of light, and Jesus is only seen from behind.
 */

export const G = 104;
type Who = Partial<PersonProps>;

/** A row of men with spears (servants, soldiers, Esau's four hundred). */
export const Troop = ({ xs, y, s, flip }: { xs: number[]; y: number; s: number; flip?: boolean }) => (
  <>
    {xs.map((x, i) => (
      <P
        key={i}
        x={x}
        y={y}
        s={s}
        flip={flip}
        robe={[C.pale, C.woodSoft, C.steelSoft, C.redSoft][i % 4]}
        beard={i % 2 ? 'dark' : undefined}
        headcloth={i % 3 === 0 ? C.white : undefined}
        hands={[null, [14, -30]]}
      >
        <Stick tip x={15} y1={-62} y2={0} />
      </P>
    ))}
  </>
);

/** Jesus (seen from behind) calls the fishermen from their boat. */
const CallFishers = () => (
  <>
    <Waves y={90} />
    <path d="M0 120 V88 Q28 82 50 96 Q62 106 58 120 Z" fill={C.sand} {...line} />
    <P x={98} y={98} s={0.72} flip look={1} robe={C.pale} beard="dark" pose="raise" />
    <P x={128} y={98} s={0.72} flip look={1} robe={C.redSoft} headcloth={C.white} hands={[null, [18, -26]]} />
    <path d="M72 82 H152 L142 106 H84 Z" fill={C.wood} {...line} />
    <path d="M80 92 H146" {...line} strokeWidth={2} opacity={0.5} />
    <path d="M108 80 q-4 22 8 28 q12 -6 8 -28 Z" fill={C.white} {...line} strokeWidth={2} />
    <path d="M108 88 h16 M108 96 h17 M113 80 v26 M120 80 v26" {...line} strokeWidth={1.2} opacity={0.6} />
    <path d="M110 100 q6 -5 12 0 q-6 5 -12 0 Z" fill={C.steel} {...line} strokeWidth={1.6} />
    <P x={28} y={104} s={0.92} back robe={C.white} hair={C.wood} sash={C.red} pose="point" />
  </>
);

/** Cain and Abel bring their offerings: Abel's is accepted, and Cain is angry. */
const CainAbel = () => (
  <>
    <Ground />
    <AltarSm x={26} y={G} s={0.9} />
    <P x={58} y={G} s={0.82} flip look={1} robe={C.pale} pose="raise" />
    <Animal x={80} y={G} s={0.5} flip />
    <AltarSm x={138} y={G} s={0.9} fire={false} />
    <circle cx={132} cy={76} r={4.5} fill={C.red} {...line} strokeWidth={2} />
    <circle cx={141} cy={75} r={5} fill={C.pale} {...line} strokeWidth={2} />
    <circle cx={137} cy={70} r={4.5} fill={C.bread} {...line} strokeWidth={2} />
    <P x={108} y={G} s={0.9} flip look={1} mood="angry" robe={C.wood} beard="dark" hands={[[2, -26], [-4, -30]]} />
    <path d="M88 38 l5 -5 M92 46 h7 M96 30 l2 -6" {...line} strokeWidth={2.2} />
  </>
);

/** Men begin to call upon the name of the LORD. */
const PrayCall = () => (
  <>
    <Light x={128} y={26} />
    <Ground />
    <P x={34} y={G} s={0.95} pose="kneel" look={1} robe={C.steel} beard="dark" hands={[[-14, -56], [14, -56]]} />
    <P x={76} y={G} s={0.9} pose="kneel" look={1} woman robe={C.redSoft} headcloth={C.sand} hands={[[-14, -56], [14, -56]]} />
    <P x={112} y={G} child s={1.05} pose="kneel" look={1} robe={C.pale} hands={[[-14, -56], [14, -56]]} />
  </>
);

/** A man walks with God along the path, toward the light. */
const WalkWithGod = () => (
  <>
    <Light x={132} y={24} r={13} />
    <path d="M4 116 Q60 104 86 88 Q106 74 122 46" fill="none" stroke={C.sand} strokeWidth={22} strokeLinecap="round" />
    {[[14, 110, -70], [30, 104, -65], [46, 98, -60]].map(([x, y, r], i) => (
      <ellipse key={i} cx={x} cy={y} rx={3} ry={5} fill={C.wood} transform={`rotate(${r} ${x} ${y})`} />
    ))}
    <P x={78} y={100} s={0.95} pose="walk" look={1} robe={C.pale} beard="white" headcloth={C.white} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-52} y2={0} />
    </P>
  </>
);

/** Noah at the window of the ark, sending out the raven / welcoming the dove with its olive leaf. */
const NoahBird = ({ raven }: { raven?: boolean }) => (
  <>
    <path d="M108 100 L126 74 L140 92 L148 82 L160 100 Z" fill={C.paleDeep} {...line} strokeWidth={2.4} />
    <Waves y={100} />
    <path d="M0 22 H86 Q96 62 84 108 H0 Z" fill={C.wood} {...line} />
    <path d="M0 46 H90 M0 86 H89" {...line} strokeWidth={2} opacity={0.45} />
    <path d="M0 22 V10 H78 L92 22 Z" fill={C.red} {...line} />
    <rect x={32} y={30} width={42} height={46} rx={4} fill={C.night} {...line} />
    <clipPath id="cp-noah">
      <rect x={33.5} y={31.5} width={130} height={43} />
    </clipPath>
    <g clipPath="url(#cp-noah)">
      <P x={52} y={98} s={0.88} look={1} robe={C.steel} beard="white" hands={[[-4, -30], [36, -50]]} />
    </g>
    <path d="M28 76 H78" {...line} strokeWidth={4} />
    {raven ? <Bird x={122} y={38} fill={C.black} /> : <Bird x={122} y={44} flip leaf />}
    {raven && <path d="M96 44 h8 M98 36 h6" {...line} strokeWidth={2} opacity={0.6} />}
  </>
);

/** Someone kneels at an altar with a burnt offering: Noah after the flood, Jacob at Shechem, Jacob at Beer-sheba by night. */
const AltarScene = ({ who }: { who: 'noah' | 'jacob' | 'night' }) => (
  <>
    {who === 'night' && (
      <>
        <Night />
        {[[24, 24, 4], [50, 16, 3], [136, 22, 4], [118, 44, 3], [30, 50, 3]].map(([x, y, r], i) => (
          <StarPt key={i} x={x} y={y} r={r} />
        ))}
        <path d="M84 6 H112 L92 70 H44 Z" fill={C.bread} opacity={0.28} />
        <Earth y={98} />
      </>
    )}
    {who === 'noah' && (
      <>
        <path d="M22 104a62 62 0 0 1 124 0" fill="none" stroke={C.red} strokeWidth={6} />
        <path d="M30 104a54 54 0 0 1 108 0" fill="none" stroke={C.pale} strokeWidth={6} />
        <path d="M38 104a46 46 0 0 1 92 0" fill="none" stroke={C.steel} strokeWidth={6} />
        <path d="M6 104 Q10 58 30 56 Q50 60 56 104 Z" fill={C.paleDeep} {...line} />
        <path d="M12 50 H50 L44 60 H18 Z" fill={C.wood} {...line} strokeWidth={2.4} />
        <rect x={22} y={40} width={18} height={10} rx={2} fill={C.woodSoft} {...line} strokeWidth={2.2} />
        <path d="M19 41 L31 33 L43 41 Z" fill={C.red} {...line} strokeWidth={2.2} />
      </>
    )}
    {who === 'jacob' && <TentSm x={30} y={G} s={0.85} />}
    {who !== 'night' && <Ground />}
    <AltarSm x={104} y={who === 'night' ? 102 : G} />
    <P
      x={70}
      y={who === 'night' ? 104 : G}
      s={0.88}
      pose="kneel"
      look={1}
      robe={who === 'jacob' ? C.pale : C.steel}
      beard={who === 'jacob' ? 'dark' : 'white'}
      headcloth={who === 'noah' ? undefined : C.white}
      hands={[[-14, -56], [14, -56]]}
    />
    {who === 'noah' && <P x={138} y={G} s={0.8} flip look={1} woman robe={C.redSoft} headcloth={C.sand} />}
    {who === 'jacob' && <Animal x={140} y={G} s={0.6} flip />}
  </>
);

/** Abram leaves his country: walking with Sarai and a loaded camel toward the land God shows him. */
const AbramJourney = () => (
  <>
    <Hills />
    <Light x={136} y={22} r={10} />
    <Ground />
    <Camel x={36} y={G} s={0.6}>
      <rect x={44} y={48} width={16} height={14} rx={4} fill={C.woodSoft} {...line} strokeWidth={2.4} />
    </Camel>
    <P x={84} y={G} s={0.8} pose="walk" woman robe={C.redSoft} headcloth={C.sand} look={1} />
    <P x={116} y={G} s={0.9} pose="walk" robe={C.steel} beard="dark" headcloth={C.white} look={1} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-54} y2={0} />
    </P>
  </>
);

/** Abram and Lot part in peace: each points a different way, with his own flock. */
const AbramLot = () => (
  <>
    <Hills />
    <Ground />
    <Animal x={30} y={96} s={0.55} flip />
    <Animal x={18} y={G} s={0.7} flip />
    <Animal x={130} y={96} s={0.55} />
    <Animal x={140} y={G} s={0.7} />
    <P x={66} y={G} s={0.9} flip pose="point" look={-1} robe={C.steel} beard="dark" headcloth={C.white} />
    <P x={96} y={G} s={0.9} pose="point" look={-1} robe={C.pale} beard="dark" />
  </>
);

/** Abram leads his trained servants out by night to rescue Lot. */
const Abram318 = () => (
  <>
    <Night />
    {[[24, 20, 3.5], [70, 16, 3], [110, 26, 3.5], [140, 18, 3]].map(([x, y, r], i) => (
      <StarPt key={i} x={x} y={y} r={r} />
    ))}
    <Earth y={94} />
    <Troop xs={[22, 42, 62, 82]} y={98} s={0.6} />
    <Troop xs={[32, 54, 76, 96]} y={108} s={0.68} />
    <P x={126} y={108} s={0.95} look={1} robe={C.steel} beard="dark" headcloth={C.white} hands={[null, [16, -52]]}>
      <SwordSm x={16} y={-52} r={20} />
    </P>
  </>
);

/** The angel of the LORD finds Hagar by a fountain in the wilderness and sends her back. */
const HagarAngel = () => (
  <>
    <Ground />
    <Palm x={18} y={G} s={0.95} />
    <ellipse cx={86} cy={100} rx={20} ry={6} fill={C.water} {...line} strokeWidth={2.6} />
    <path d="M86 98 q-5 -14 -9 -3 M86 98 q5 -14 9 -3" fill="none" {...line} stroke={C.steel} strokeWidth={2.6} />
    <ellipse cx={68} cy={101} rx={7} ry={4.5} fill={C.steelSoft} {...line} strokeWidth={2.2} />
    <ellipse cx={103} cy={102} rx={6} ry={4} fill={C.sand} {...line} strokeWidth={2.2} />
    <P x={50} y={G} s={0.88} pose="kneel" woman robe={C.redSoft} headcloth={C.sand} mood="sad" look={1} />
    <P x={128} y={G} s={0.92} flip wings robe={C.white} sash={C.steel} hair={C.bread} pose="point" look={1} />
  </>
);

/** Abraham stands before the LORD and pleads for Sodom. */
const AbrahamPleads = () => (
  <>
    <Light x={30} y={26} r={13} />
    <Palm x={150} y={G} s={0.7} />
    <Town x={118} y={G} s={1.25} />
    <Ground />
    <P x={64} y={G} s={0.98} flip pose="raise" look={1} robe={C.steel} beard="white" headcloth={C.white} />
  </>
);

/** Abraham weighs out silver to Ephron for the field and the cave of Machpelah. */
const BuyCave = () => (
  <>
    <path d="M96 104 Q102 42 136 38 Q152 40 152 104 Z" fill={C.sand} {...line} />
    <path d="M118 104 Q120 72 131 70 Q142 72 144 104 Z" fill={C.night} {...line} />
    <Ground />
    <P x={32} y={G} s={0.9} look={1} robe={C.steel} beard="white" headcloth={C.white} hands={[null, [18, -46]]}>
      <path d="M18 -46 V-42 M5 -42 H31 M5 -42 L1 -28 M5 -42 L9 -28 M31 -42 L27 -24 M31 -42 L35 -24" fill="none" {...line} strokeWidth={1.6} />
      <path d="M-1 -28 H11 Q5 -21 -1 -28 Z M25 -24 H37 Q31 -17 25 -24 Z" fill={C.bread} {...line} strokeWidth={1.8} />
      <ellipse cx={31} cy={-26} rx={4} ry={2} fill={C.steelSoft} {...line} strokeWidth={1.4} />
    </P>
    <Coins x={52} y={G} n={5} />
    <P x={90} y={G} s={0.9} flip look={1} robe={C.pale} beard="dark" headcloth={C.red} hands={[null, [16, -28]]} />
  </>
);

/** Abraham and Isaac (carrying the wood) go to the mountain with two young men and the ass. */
const MoriahJourney = () => (
  <>
    <path d="M100 104 L136 36 L156 72 V104 Z" fill={C.pale} {...line} />
    <path d="M129 49 L136 36 L143 49 Q136 54 129 49 Z" fill={C.white} {...line} strokeWidth={2.2} />
    <Light x={104} y={22} r={9} />
    <Ground />
    <Animal kind="donkey" x={20} y={G} s={0.72} />
    <P x={50} y={G} s={0.72} pose="walk" look={1} robe={C.woodSoft} headcloth={C.white} />
    <P x={68} y={G} s={0.72} pose="walk" look={1} robe={C.paleDeep} />
    <P x={94} y={G} child s={1.02} pose="walk" look={1} robe={C.redSoft}>
      <path d="M-15 -44 L-11 -12 M-10 -47 L-7 -14 M-19 -42 L-16 -14" {...line} strokeWidth={5} />
      <path d="M-15 -44 L-11 -12 M-10 -47 L-7 -14 M-19 -42 L-16 -14" stroke={C.wood} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-20 -30 L-6 -32" {...line} stroke={C.red} strokeWidth={2.4} />
    </P>
    <P x={122} y={G} s={0.88} pose="walk" look={1} robe={C.steel} beard="white" headcloth={C.white} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-54} y2={0} />
    </P>
  </>
);

/** Jacob, with goat skins on his arms, brings the food to his blind father Isaac. */
const JacobIsaac = () => (
  <>
    <Ground />
    <ellipse cx={18} cy={78} rx={11} ry={7} fill={C.white} {...line} strokeWidth={2.4} />
    <P x={34} y={98} s={0.88} pose="sit" seat={false} robe={C.sand} beard="white" mood="sleep" look={1} hands={[null, [40, -22]]} />
    <path d="M8 104 V86 H76 V104 M8 94 H76" fill="none" {...line} />
    <rect x={8} y={86} width={68} height={8} rx={3} fill={C.woodSoft} {...line} />
    <P x={110} y={G} s={0.9} flip look={1} robe={C.steel} hands={[[-6, -28], [32, -38]]}>
      <path d="M14 -37.5 L29 -38" {...line} stroke={C.mane} strokeWidth={8} />
      <path d="M12 -42 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 M12 -33 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3" fill="none" {...line} strokeWidth={1.5} />
      <path d="M-15 -30 h17 q-1 9 -8.5 9 q-7.5 0 -8.5 -9 Z" fill={C.bread} {...line} strokeWidth={2} />
      <path d="M-9 -34 q-2 -4 1 -7 M-3 -34 q-2 -4 1 -7" fill="none" {...line} strokeWidth={1.6} opacity={0.5} />
    </P>
  </>
);

/** Esau, the hunter, is angry and vows against Jacob, who flees. */
const EsauAngry = () => (
  <>
    <Hills />
    <Ground />
    <P x={138} y={92} s={0.45} pose="walk" look={1} robe={C.steel} hands={[null, [14, -40]]}>
      <Stick x={12} y1={-58} y2={-30} />
    </P>
    <path d="M112 86 h8 M108 92 h10" {...line} strokeWidth={2} opacity={0.5} />
    <P x={62} y={G} s={1.05} robe={C.wood} beard="red" hair={C.red} mood="angry" look={1} sash={C.night} hands={[[-14, -22], [20, -54]]}>
      <path d="M-12 -52 Q-30 -30 -12 -6" fill="none" {...line} strokeWidth={5} />
      <path d="M-12 -52 Q-30 -30 -12 -6" fill="none" stroke={C.woodSoft} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-12 -52 V-6" {...line} strokeWidth={1.4} />
    </P>
    <path d="M90 34 l6 -5 M94 42 h8 M98 26 l2 -6" {...line} strokeWidth={2.4} />
  </>
);

/** Jacob sleeps with a stone for his pillow and dreams of the ladder with angels going up and down. */
const JacobDream = () => (
  <>
    <Night />
    {[[22, 22], [44, 40], [70, 18], [146, 60], [20, 62]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={1.8} fill={C.white} />
    ))}
    <ellipse cx={128} cy={15} rx={24} ry={8} fill={C.bread} />
    <Earth y={98} />
    <path d="M96 112 L120 16 M120 112 L138 16" {...line} stroke={C.bread} strokeWidth={5} />
    {[100, 84, 68, 52, 36].map((y, i) => (
      <path key={i} d={`M${96 + (24 * (112 - y)) / 96} ${y} H${120 + (18 * (112 - y)) / 96}`} stroke={C.bread} strokeWidth={3.6} strokeLinecap="round" />
    ))}
    <P x={113} y={74} s={0.42} wings robe={C.white} hair={C.bread} sash={C.steel} />
    <P x={124} y={42} s={0.36} wings robe={C.white} hair={C.bread} sash={C.steel} />
    <ellipse cx={30} cy={100} rx={13} ry={6.5} fill={C.steelSoft} {...line} />
    <P x={84} y={92} s={0.82} rot={-90} robe={C.steel} beard="dark" mood="sleep" />
    <text x={46} y={66} fontSize={14} fontWeight={800} fill={C.white} fontFamily="system-ui">z</text>
    <text x={57} y={54} fontSize={10} fontWeight={800} fill={C.white} fontFamily="system-ui">z</text>
  </>
);

/** Jacob rolls the stone from the well's mouth for Rachel and her father's sheep. */
const JacobRachel = () => (
  <>
    <Hills />
    <Ground />
    <Animal x={128} y={95} s={0.55} flip />
    <Animal x={148} y={97} s={0.55} flip />
    <WellSm x={60} y={G} s={1.05} />
    <ellipse cx={72} cy={80} rx={15} ry={7} fill={C.sand} {...line} transform="rotate(24 72 80)" />
    <P x={26} y={G} s={0.9} look={1} robe={C.steel} beard="dark" hands={[[18, -24], [26, -32]]} lean={12} />
    <P x={104} y={G} s={0.84} flip woman robe={C.redSoft} headcloth={C.white} look={1} hands={[null, [14, -30]]}>
      <Stick crook x={15} y1={-54} y2={0} />
    </P>
    <Animal x={136} y={G} s={0.68} flip />
  </>
);

/** Two men embrace: Laban welcomes Jacob; Esau runs to meet Jacob. */
const Embrace = ({ a, b, back }: { a: Who; b: Who; back?: ReactNode }) => (
  <>
    {back}
    <Ground />
    <P x={68} y={G} s={0.98} look={1} lean={9} hands={[[-4, -26], [24, -32]]} {...a} />
    <P x={94} y={G} s={0.98} flip look={1} lean={9} hands={[[-4, -26], [24, -32]]} {...b} />
    <path d="M81 24 q-6 -8 -10 -2 q-2 6 10 13 q12 -7 10 -13 q-4 -6 -10 2 Z" fill={C.red} {...line} strokeWidth={2.2} />
  </>
);
const LabanWelcome = () => (
  <Embrace
    a={{ robe: C.wood, beard: 'white', headcloth: C.red }}
    b={{ robe: C.steel, beard: 'dark' }}
    back={
      <>
        <path d="M8 104 V58 H44 V104 Z" fill={C.sand} {...line} />
        <path d="M20 104 V80 Q26 72 32 80 V104 Z" fill={C.night} {...line} strokeWidth={2.4} />
        <WellSm x={134} y={G} s={0.8} />
      </>
    }
  />
);
const EsauEmbrace = () => (
  <Embrace
    a={{ robe: C.steel, beard: 'dark' }}
    b={{ robe: C.wood, beard: 'red', hair: C.red, sash: C.night }}
    back={
      <>
        <Hills />
        <P x={16} y={100} s={0.55} woman robe={C.redSoft} headcloth={C.sand} />
        <P x={32} y={102} child s={0.75} robe={C.pale} />
        <Troop xs={[130, 146]} y={100} s={0.55} flip />
      </>
    }
  />
);

/** A shepherd with a flock: Jacob serving Laban, young Joseph feeding the flock, the droves sent to Esau. */
const Flock = ({ who, kind = 'sheep' }: { who: Who; kind?: AnimalKind }) => (
  <>
    <Hills />
    <Light x={136} y={22} r={9} />
    <Ground />
    {[84, 112, 140].map((x) => (
      <Animal key={x} kind={kind} x={x} y={94} s={0.62} />
    ))}
    {[70, 98, 126].map((x) => (
      <Animal key={x} kind={kind} x={x} y={G} s={0.78} />
    ))}
    <P x={32} y={G} s={0.95} look={1} hands={[null, [16, -30]]} {...who}>
      <Stick crook x={17} y1={-56} y2={0} />
    </P>
  </>
);

const Mandrake = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0 q-15 -3 -17 -12 q11 0 17 12 M0 0 q-5 -14 0 -21 q5 7 0 21 M0 0 q15 -3 17 -12 q-11 0 -17 12" fill={C.pale} {...line} strokeWidth={2} />
    <circle cx={-4} cy={-3} r={3.2} fill={C.redSoft} {...line} strokeWidth={1.6} />
    <circle cx={4} cy={-3} r={3.2} fill={C.redSoft} {...line} strokeWidth={1.6} />
  </g>
);

/** The boy Reuben finds mandrakes in the field at wheat harvest. */
const ReubenMandrakes = () => (
  <>
    {Array.from({ length: 15 }, (_, i) => {
      const x = 10 + i * 10;
      const top = 62 + (i % 3) * 5;
      return (
        <g key={i}>
          <path d={`M${x} 104 V${top}`} stroke={C.bread} strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={x} cy={top - 5} rx={3.2} ry={7.5} fill={C.bread} {...line} strokeWidth={1.6} />
        </g>
      );
    })}
    <Ground />
    <path d="M18 104 L15 88 H43 L40 104 Z" fill={C.wood} {...line} strokeWidth={2.6} />
    <path d="M19 88 Q29 68 39 88" fill="none" {...line} strokeWidth={2.6} />
    <circle cx={25} cy={87} r={3.2} fill={C.redSoft} {...line} strokeWidth={1.6} />
    <circle cx={33} cy={87} r={3.2} fill={C.redSoft} {...line} strokeWidth={1.6} />
    <Mandrake x={104} y={G} />
    <Mandrake x={136} y={G} />
    <P x={72} y={G} child s={1.3} pose="bowStand" lean={42} look={1} robe={C.pale} hands={[[2, -26], [22, -26]]} />
  </>
);

/** A mistress and her handmaid at the tent. */
const Handmaid = () => (
  <>
    <TentSm x={36} y={G} s={1.1} />
    <Ground />
    <P x={84} y={G} s={0.88} pose="sit" woman robe={C.red} headcloth={C.bread} look={1} />
    <P x={128} y={G} s={0.88} flip woman robe={C.pale} headcloth={C.white} look={1} hands={[[12, -30], [16, -40]]}>
      <path d="M12 -40 q-3 -12 5 -15 h5 q8 3 5 15 q-2 9 -7.5 9 q-5.5 0 -7.5 -9 Z" fill={C.woodSoft} {...line} strokeWidth={2.2} />
      <path d="M16 -55 h7" {...line} strokeWidth={3} />
    </P>
  </>
);

/** Jacob's family at the tent: a mother with her baby, and the children. */
const MotherSons = () => (
  <>
    <TentSm x={30} y={G} s={1.05} />
    <Ground />
    <P x={66} y={G} s={0.9} look={1} robe={C.steel} beard="dark" headcloth={C.white} />
    <P x={98} y={G} s={0.88} pose="sit" woman robe={C.redSoft} headcloth={C.sand} hands={[[10, -22], [16, -26]]}>
      <ellipse cx={13} cy={-27} rx={9.5} ry={5.5} fill={C.white} {...line} strokeWidth={2} transform="rotate(-18 13 -27)" />
      <circle cx={20} cy={-33} r={4.6} fill={C.skin} {...line} strokeWidth={1.8} />
      <circle cx={19} cy={-33.5} r={0.9} fill={INK} />
      <circle cx={22} cy={-33.5} r={0.9} fill={INK} />
    </P>
    <P x={128} y={G} child s={1} robe={C.pale} />
    <P x={146} y={G} child s={0.85} woman robe={C.bread} headcloth={C.red} />
  </>
);

/** A man riding a camel. */
const Rider = ({ x, y, s, who }: { x: number; y: number; s: number; who?: Who }) => (
  <>
    <Camel x={x} y={y} s={s} />
    <P x={x - 6 * s} y={y - 43 * s} s={s * 0.95} pose="sit" seat={false} look={1} {...who} />
  </>
);

/** Laban and his brethren pursue Jacob on camels toward mount Gilead. */
const LabanChase = () => (
  <>
    <path d="M8 104 L40 58 L64 86 L96 46 L128 88 L152 70 V104 Z" fill={C.pale} opacity={0.55} />
    <Ground />
    <Rider x={30} y={98} s={0.36} who={{ robe: C.pale, beard: 'dark' }} />
    <Rider x={58} y={G} s={0.44} who={{ robe: C.steel, headcloth: C.white }} />
    <Rider x={108} y={G} s={0.66} who={{ robe: C.wood, beard: 'white', headcloth: C.red, pose: 'sit', hands: [null, [28, -40]] }} />
    <path d="M74 98 h-9 M78 90 h-8 M150 96 h6" {...line} strokeWidth={2} opacity={0.5} />
  </>
);

const Idol = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-4.5 0 V-10 H4.5 V0 Z" fill={C.steelSoft} {...line} strokeWidth={2} />
    <circle cx={0} cy={-14} r={5} fill={C.steelSoft} {...line} strokeWidth={2} />
    <circle cx={-1.8} cy={-14.5} r={0.9} fill={INK} />
    <circle cx={1.8} cy={-14.5} r={0.9} fill={INK} />
    <path d="M-2 -11.5 h4" {...line} strokeWidth={1.2} />
  </g>
);

/** Rachel sits on the camel's saddle in the tent, hiding the images, while Laban searches. */
const RachelCamel = () => (
  <>
    <path d="M8 104 L80 10 L152 104 Z" fill={C.sand} {...line} />
    <path d="M80 10 L50 104 M80 10 L110 104" {...line} strokeWidth={2} opacity={0.3} />
    <Idol x={139} y={G} />
    <Idol x={147} y={G} s={0.85} />
    <P x={118} y={98} s={0.82} flip pose="sit" seat={false} woman robe={C.pale} headcloth={C.white} look={1} />
    <path d="M98 104 V90 q3 -9 12 -7 h16 q9 -2 12 7 V104 Z" fill={C.red} {...line} />
    <path d="M100 97 H136" stroke={C.steel} strokeWidth={4} strokeLinecap="round" />
    <Sack open x={72} y={G} s={0.9} />
    <P x={42} y={G} s={0.88} pose="bowStand" lean={38} look={1} mood="angry" robe={C.wood} beard="white" headcloth={C.red} />
  </>
);

export { Idol };

export const SCENES_A = {
  callFishers: CallFishers,
  cainAbel: CainAbel,
  prayCall: PrayCall,
  walkWithGod: WalkWithGod,
  noahRaven: () => <NoahBird raven />,
  noahDove: () => <NoahBird />,
  noahAltar: () => <AltarScene who="noah" />,
  jacobAltar: () => <AltarScene who="jacob" />,
  nightAltar: () => <AltarScene who="night" />,
  abramJourney: AbramJourney,
  abramLot: AbramLot,
  abram318: Abram318,
  hagarAngel: HagarAngel,
  abrahamPleads: AbrahamPleads,
  buyCave: BuyCave,
  moriahJourney: MoriahJourney,
  jacobIsaac: JacobIsaac,
  esauAngry: EsauAngry,
  jacobDream: JacobDream,
  jacobRachel: JacobRachel,
  labanWelcome: LabanWelcome,
  esauEmbrace: EsauEmbrace,
  jacobShepherd: () => <Flock who={{ robe: C.steel, beard: 'dark', headcloth: C.white }} />,
  josephShepherd: () => <Flock who={{ robe: C.red, stripes: true }} />,
  goatDrove: () => <Flock who={{ robe: C.woodSoft, headcloth: C.white }} kind="goat" />,
  reubenMandrakes: ReubenMandrakes,
  handmaid: Handmaid,
  motherSons: MotherSons,
  labanChase: LabanChase,
  rachelCamel: RachelCamel,
};
