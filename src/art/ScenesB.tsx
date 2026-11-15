import { C, Ground, INK, Person as P, line } from './kit';
import { Animal, Bubble, Camel, CoatSm, Coins, CupSm, Hills, Light, Oak, Sack, Stick, StarPt, SwordSm, Table, Town, Wheel } from './sceneKit';
import { G, Idol, Troop } from './ScenesA';

/*
 * Scene pictures, part 2 (Genesis 31–50): Jacob's return, Joseph and his brothers, Egypt.
 * Same rules as part 1: people doing the action of the question, flat fills, ink outline.
 */

const esau = { robe: C.wood, beard: 'red', hair: C.red, sash: C.night } as const;
const jacob = { robe: C.steel, beard: 'dark' } as const;
const oldJacob = { robe: C.steel, beard: 'white', headcloth: C.white } as const;
const egyptian = { robe: C.white, sash: C.steel, nemes: true } as const;

/** The angels of God meet Jacob on his way home (Mahanaim). */
const AngelsMeet = () => (
  <>
    <Hills />
    <Ground />
    <P x={40} y={G} s={0.92} pose="walk" look={1} mood="wow" {...jacob} headcloth={C.white} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-54} y2={0} />
    </P>
    <P x={98} y={G} s={0.84} flip wings look={1} robe={C.white} hair={C.bread} sash={C.steel} hands={[null, [22, -50]]} />
    <P x={132} y={G} s={0.84} flip wings look={1} robe={C.white} hair={C.bread} sash={C.pale} />
  </>
);

/** Esau comes to meet Jacob with four hundred men. */
const Esau400 = () => (
  <>
    <Hills />
    <Ground />
    <Troop xs={[100, 116, 132, 148]} y={94} s={0.5} flip />
    <Troop xs={[108, 124, 140, 156]} y={G} s={0.58} flip />
    <P x={84} y={G} s={0.95} flip look={1} pose="point" {...esau} />
    <P x={30} y={G} s={0.9} look={1} mood="wow" {...jacob} hands={[[-4, -44], [10, -46]]} />
  </>
);

/** Jacob wrestles with the man until the breaking of the day (Peniel). */
const Wrestle = () => (
  <>
    <Light x={128} y={72} r={14} />
    <path d="M8 104 V78 Q50 68 92 76 Q124 82 152 72 V104 Z" fill={C.pale} />
    <Ground />
    <P x={58} y={G} s={0.98} look={1} mood="angry" lean={18} {...jacob} hands={[[28, -40], [32, -48]]} />
    <P x={104} y={G} s={0.98} flip look={1} lean={18} robe={C.white} sash={C.steel} beard="dark" hands={[[28, -40], [32, -48]]} />
  </>
);

/** Jacob bows himself to the ground before Esau, his family behind him. */
const JacobBows = () => (
  <>
    <Hills />
    <Ground />
    <P x={18} y={G} s={0.62} woman robe={C.redSoft} headcloth={C.sand} look={1} />
    <P x={34} y={G} s={0.75} child robe={C.pale} look={1} />
    <P x={64} y={G} s={0.95} pose="bow" lean={58} {...jacob} hands={[[14, -32], [16, -30]]} />
    <P x={126} y={G} s={0.98} flip pose="walk" look={1} mood="wow" {...esau} hands={[[-16, -46], [24, -48]]} />
  </>
);

/** Jacob and Laban make a heap of stones as a witness and swear by it (Galeed, Mizpah). */
const HeapStones = () => (
  <>
    <Hills />
    <Ground />
    <rect x={72} y={46} width={16} height={34} rx={5} fill={C.steelSoft} {...line} />
    {[[56, 96, 9], [72, 97, 9], [88, 97, 9], [104, 96, 9], [64, 86, 8], [80, 86, 9], [96, 86, 8], [72, 76, 7], [88, 76, 7]].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? C.steelSoft : C.sand} {...line} strokeWidth={2.4} />
    ))}
    <P x={30} y={G} s={0.92} look={1} {...jacob} hands={[null, [14, -64]]} />
    <P x={130} y={G} s={0.92} flip look={1} robe={C.wood} beard="white" headcloth={C.red} hands={[null, [14, -64]]} />
  </>
);

/** Simeon and Levi take their swords and go against the city. */
const SimeonLevi = () => (
  <>
    <Town x={128} y={G} s={1.45} />
    <Ground />
    <P x={34} y={G} s={0.95} pose="walk" look={1} mood="angry" robe={C.pale} beard="dark" hands={[null, [18, -54]]}>
      <SwordSm x={18} y={-54} r={25} />
    </P>
    <P x={72} y={G} s={0.95} pose="walk" look={1} mood="angry" robe={C.redSoft} beard="dark" headcloth={C.white} hands={[null, [18, -54]]}>
      <SwordSm x={18} y={-54} r={25} />
    </P>
  </>
);

/** Jacob hides the strange gods and the earrings in the ground under the oak by Shechem. */
const BuryIdols = () => (
  <>
    <Oak x={124} y={G} s={1.1} />
    <Ground />
    <ellipse cx={96} cy={104} rx={17} ry={5} fill={C.night} {...line} />
    <Idol x={92} y={105} s={0.7} />
    <path d="M70 104 q4 -8 12 -6 q6 2 8 6 Z" fill={C.woodSoft} {...line} strokeWidth={2.2} />
    <P x={64} y={G} s={0.9} pose="kneel" look={1} {...jacob} hands={[[18, -20], [26, -16]]}>
      <Idol x={26} y={-8} s={0.8} />
    </P>
    <P x={24} y={G} s={0.82} look={1} woman robe={C.redSoft} headcloth={C.sand} hands={[null, [16, -34]]}>
      <circle cx={19} cy={-34} r={3} fill="none" {...line} stroke={C.bread} strokeWidth={2} />
      <circle cx={21} cy={-30} r={2.6} fill="none" {...line} stroke={C.bread} strokeWidth={2} />
    </P>
  </>
);

/** Mourning: under the oak below Bethel (Deborah), or at the threshing floor of Atad (Jacob). */
const Mourn = ({ atad }: { atad?: boolean }) => (
  <>
    {atad ? (
      <>
        <Hills />
        <ellipse cx={80} cy={104} rx={62} ry={6} fill={C.sand} />
      </>
    ) : (
      <Oak x={80} y={G} s={1.15} />
    )}
    <Ground />
    <path d="M58 104 V92 M102 104 V92" {...line} strokeWidth={4} />
    <rect x={52} y={86} width={56} height={8} rx={3} fill={C.wood} {...line} />
    <path d="M58 86 Q56 78 64 77 Q66 72 72 74 Q86 76 98 77 Q104 79 102 86 Z" fill={C.white} {...line} strokeWidth={2.6} /><path d="M70 80 Q72 84 76 80 M84 79 l2 6 M92 79 l2 6" fill="none" {...line} strokeWidth={1.4} opacity={0.5} />
    <P x={30} y={G} s={0.82} look={1} mood="cry" {...(atad ? egyptian : { robe: C.redSoft, woman: true, headcloth: C.sand })} hands={[[2, -46], [8, -46]]} />
    <P x={128} y={G} s={0.82} flip look={1} mood="cry" robe={C.pale} beard="dark" headcloth={C.white} hands={[[2, -46], [8, -46]]} />
    {atad && <P x={148} y={G} s={0.66} flip look={1} mood="cry" robe={C.steel} beard="dark" />}
  </>
);

/** A small bound sheaf for the dream bubble, standing at (x, y) and tipped `tilt` degrees. */
const MiniSheaf = ({ x, y, s = 1, tilt = 0 }: { x: number; y: number; s?: number; tilt?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
    <path d="M-6 0 L-2 -12 L-8 -26 Q0 -33 8 -26 L2 -12 L6 0 Z" fill={C.bread} {...line} strokeWidth={2} />
    <path d="M-3 -12 H3" stroke={C.red} strokeWidth={3} strokeLinecap="round" />
    <path d="M-3 -22 l1 -4 M3 -22 l-1 -4" {...line} strokeWidth={1.2} />
  </g>
);

/** Joseph dreams: the sheaves bow to his sheaf; the sun, the moon and eleven stars bow to him. */
const JosephDreams = () => (
  <>
    <Ground />
    <rect x={14} y={96} width={92} height={8} rx={3} fill={C.sand} {...line} strokeWidth={2.4} />
    <P x={96} y={92} s={0.78} rot={-90} robe={C.red} stripes mood="sleep" />
    <text x={112} y={90} fontSize={13} fontWeight={800} fill={INK} fontFamily="system-ui">z</text>
    <Bubble x={8} y={6} w={144} h={56} tail={[40, 78]}>
      <MiniSheaf x={20} y={58} tilt={38} />
      <MiniSheaf x={46} y={58} s={1.3} />
      <MiniSheaf x={72} y={58} tilt={-38} />
      <path d="M80 14 V54" {...line} strokeWidth={1.6} opacity={0.3} />
      <circle cx={92} cy={24} r={8} fill={C.bread} {...line} strokeWidth={2.2} />
      <path d="M120 16 a9 9 0 1 0 6 14 a7 7 0 1 1 -6 -14 Z" fill={C.steelSoft} {...line} strokeWidth={2} />
      {Array.from({ length: 11 }, (_, i) => (
        <StarPt key={i} x={84 + (i % 6) * 11 + (i >= 6 ? 5 : 0)} y={i < 6 ? 44 : 55} r={3.6} />
      ))}
    </Bubble>
  </>
);

/** Joseph in the pit; Reuben holds back the brothers: "Shed no blood." */
const ReubenPit = () => (
  <>
    <Hills />
    <Ground />
    <clipPath id="cp-pit">
      <path d="M0 0 H160 V100 H0 Z" />
      <ellipse cx={78} cy={101} rx={24} ry={8} />
    </clipPath>
    <ellipse cx={78} cy={101} rx={24} ry={8} fill={C.night} {...line} />
    <g clipPath="url(#cp-pit)">
      <P x={78} y={126} child s={1.05} mood="sad" look={-1} robe={C.sand} pose="raise" />
    </g>
    <path d="M54 101 q24 12 48 0" fill="none" {...line} />
    <P x={26} y={G} s={0.9} look={1} mood="angry" robe={C.pale} beard="dark" hands={[null, [16, -40]]}>
      <Stick x={18} y1={-58} y2={-28} />
    </P>
    <P x={128} y={G} s={0.95} flip look={1} robe={C.woodSoft} beard="dark" headcloth={C.white} hands={[[-6, -30], [30, -44]]} />
  </>
);

/** Joseph's brothers sell him to the Ishmeelite traders for twenty pieces of silver. */
const JosephSold = () => (
  <>
    <Hills />
    <Ground />
    <Camel x={146} y={G} s={0.6} flip />
    <P x={30} y={G} s={0.92} look={1} robe={C.redSoft} beard="dark" hands={[null, [18, -34]]}>
      <Coins x={18} y={-34} n={3} s={0.7} />
    </P>
    <P x={70} y={G} s={0.92} flip look={1} robe={C.bread} beard="dark" headcloth={C.red} hands={[[-12, -24], [22, -36]]} />
    <path d="M80 82 Q92 92 100 86" fill="none" {...line} strokeWidth={2} />
    <P x={106} y={G} child s={1.05} flip look={1} mood="sad" robe={C.sand} hands={[[16, -24], [18, -26]]} />
  </>
);

/** The brothers dip Joseph's coat in the blood of a kid of the goats. */
const CoatBlood = () => (
  <>
    <Hills />
    <Ground />
    <Animal kind="goat" x={136} y={G} s={0.75} flip />
    <path d="M60 104 Q60 92 80 92 Q100 92 100 104 Z" fill={C.steelSoft} {...line} />
    <ellipse cx={80} cy={93} rx={18} ry={4} fill="#9b2c25" {...line} strokeWidth={2.2} />
    <P x={40} y={G} s={0.92} pose="kneel" look={1} robe={C.pale} beard="dark" hands={[[22, -26], [30, -30]]}>
      <CoatSm x={34} y={-14} s={0.8} blood />
    </P>
    <P x={112} y={G} s={0.88} flip look={1} robe={C.woodSoft} beard="dark" headcloth={C.white} />
  </>
);

/** Tamar shows the signet, the bracelets and the staff: "Discern, whose are these?" */
const TamarSignet = () => (
  <>
    <Ground />
    <P x={46} y={G} s={0.95} look={1} woman robe={C.red} headcloth={C.steel} hands={[[14, -24], [26, -40]]}>
      <Stick x={14} y1={-60} y2={0} />
      <circle cx={30} cy={-44} r={4} fill="none" {...line} stroke={C.bread} strokeWidth={2.6} />
      <circle cx={14} cy={-30} r={4.5} fill="none" {...line} stroke={C.steelSoft} strokeWidth={2.4} />
      <circle cx={14} cy={-36} r={4.5} fill="none" {...line} stroke={C.steelSoft} strokeWidth={2.4} />
    </P>
    <P x={116} y={G} s={0.98} flip look={1} mood="wow" robe={C.pale} beard="dark" headcloth={C.white} hands={[[-4, -26], [6, -34]]} />
  </>
);

/** Joseph in prison with Pharaoh's chief butler (with a cup) and chief baker (with baskets). */
const Prison = () => (
  <>
    <rect x={6} y={6} width={148} height={98} rx={16} fill={C.steelSoft} />
    {[20, 44, 68].map((y) => (
      <path key={y} d={`M6 ${y} H154 M${y % 3 ? 30 : 50} ${y} V${y + 24} M${y % 3 ? 90 : 110} ${y} V${y + 24}`} {...line} strokeWidth={1.6} opacity={0.25} />
    ))}
    <rect x={62} y={14} width={36} height={26} rx={3} fill={C.night} {...line} />
    <path d="M71 14 V40 M80 14 V40 M89 14 V40" {...line} strokeWidth={3.4} />
    <Ground />
    <P x={34} y={G} s={0.86} pose="sit" look={1} robe={C.white} sash={C.steel} hands={[null, [22, -34]]}>
      <CupSm x={22} y={-34} />
    </P>
    <P x={80} y={G} s={0.92} pose="point" look={-1} robe={C.sand} />
    <P x={126} y={G} s={0.86} flip pose="sit" look={1} robe={C.white} sash={C.red} hands={[[-6, -62], [6, -62]]}>
      {[-74, -80, -86].map((y, i) => (
        <rect key={i} x={-12} y={y} width={24} height={6} rx={3} fill={i ? C.woodSoft : C.bread} {...line} strokeWidth={1.8} />
      ))}
    </P>
  </>
);

/** Pharaoh dreams of seven fat kine and seven lean kine coming up out of the river. */
const PharaohDream = () => (
  <>
    <Ground />
    <rect x={14} y={92} width={104} height={10} rx={4} fill={C.bread} {...line} />
    <path d="M20 102 V104 M112 102 V104" {...line} strokeWidth={4} />
    <P x={104} y={90} s={0.78} rot={-90} {...egyptian} mood="sleep" />
    <text x={124} y={84} fontSize={13} fontWeight={800} fill={INK} fontFamily="system-ui">z</text>
    <Bubble x={8} y={6} w={144} h={58} tail={[42, 76]}>
      <path d="M10 56 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V62 H10 Z" fill={C.water} />
      <Animal kind="ox" x={36} y={54} s={0.62} />
      <Animal kind="ox" x={72} y={54} s={0.62} spot />
      <Animal kind="ox" x={108} y={54} s={0.6} thin fill={C.sand} />
      <Animal kind="ox" x={136} y={52} s={0.48} thin fill={C.sand} />
    </Bubble>
  </>
);

/** Joseph rides in Pharaoh's second chariot, and the people bow the knee before him. */
const JosephChariot = () => (
  <>
    <path d="M110 104 L134 58 L158 104 Z" fill={C.sand} {...line} strokeWidth={2.4} />
    <Ground />
    <Animal kind="horse" x={122} y={G} s={0.82} />
    <path d="M96 84 L114 80" {...line} strokeWidth={3} />
    <P x={80} y={88} s={0.8} look={1} {...egyptian} hands={[null, [20, -30]]}>
      <path d="M-8 -36 Q0 -28 8 -36" fill="none" {...line} stroke={C.bread} strokeWidth={3} />
      <circle cx={21} cy={-30} r={2} fill={C.bread} {...line} strokeWidth={1.2} />
    </P>
    <path d="M64 70 H100 V90 H66 Z" fill={C.red} {...line} />
    <Wheel x={80} y={92} r={12} />
    <P x={22} y={G} s={0.6} pose="bow" lean={48} robe={C.woodSoft} headcloth={C.white} />
    <P x={48} y={G} s={0.6} pose="bow" lean={48} robe={C.pale} />
  </>
);

/** Joseph's family in Egypt: his wife Asenath and their two little sons. */
const JosephFamily = () => (
  <>
    <path d="M100 104 L128 52 L156 104 Z" fill={C.sand} {...line} strokeWidth={2.4} />
    <path d="M60 104 L80 70 L100 104 Z" fill={C.sand} {...line} strokeWidth={2.4} opacity={0.7} />
    <Ground />
    <P x={40} y={G} s={0.98} look={1} {...egyptian} hands={[null, [16, -28]]}>
      <path d="M-8 -36 Q0 -28 8 -36" fill="none" {...line} stroke={C.bread} strokeWidth={3} />
    </P>
    <P x={76} y={G} s={0.9} look={-1} woman robe={C.white} headcloth={C.steel} hands={[[-12, -24], [16, -26]]} />
    <P x={102} y={G} child s={0.82} flip look={1} robe={C.pale} />
    <P x={122} y={G} child s={0.72} flip look={1} robe={C.redSoft} />
  </>
);

/** In the seven plenteous years, grain is brought into Pharaoh's storehouses. */
const Granary = () => (
  <>
    <Ground />
    <path d="M96 104 V56 Q124 22 152 56 V104 Z" fill={C.sand} {...line} />
    <path d="M114 104 V82 Q124 72 134 82 V104 Z" fill={C.night} {...line} strokeWidth={2.4} />
    <path d="M6 104 Q22 82 40 104 Z" fill={C.bread} {...line} />
    <P x={56} y={G} s={0.88} pose="walk" look={1} robe={C.white} sash={C.steel} hands={[[16, -30], [20, -32]]}>
      <Sack x={18} y={-14} s={0.72} />
    </P>
    <P x={88} y={G} s={0.8} pose="walk" look={1} robe={C.woodSoft} hands={[[16, -30], [20, -32]]}>
      <Sack x={18} y={-14} s={0.72} />
    </P>
  </>
);

/** Joseph's men bind Simeon before his brothers' eyes; the others look back as they leave. */
const SimeonBound = () => (
  <>
    <Ground />
    <Animal kind="donkey" x={20} y={G} s={0.62} flip />
    <Sack x={22} y={84} s={0.5} />
    <P x={50} y={G} s={0.86} look={-1} mood="sad" robe={C.pale} beard="dark" />
    <P x={92} y={G} s={0.95} flip look={1} mood="sad" robe={C.redSoft} beard="dark" hands={[[16, -26], [18, -28]]}>
      <path d="M12 -32 L22 -22 M12 -24 L22 -32" {...line} stroke={C.wood} strokeWidth={2.6} />
    </P>
    <path d="M76 80 Q98 92 116 76" fill="none" {...line} stroke={C.wood} strokeWidth={2.6} />
    <P x={128} y={G} s={0.95} flip look={1} {...egyptian} robe={C.steelSoft} hands={[[-4, -24], [12, -28]]} />
  </>
);

/** A son pleads with old Jacob to let Benjamin go down to Egypt (Reuben offers his two sons; Judah is surety). */
const PleadJacob = () => (
  <>
    <Ground />
    <P x={34} y={G} s={0.98} pose="sit" look={1} mood="sad" {...oldJacob} />
    <P x={14} y={G} child s={0.85} look={1} robe={C.pale} />
    <P x={100} y={G} s={0.95} flip pose="kneel" look={1} robe={C.woodSoft} beard="dark" hands={[[16, -44], [22, -40]]} />
    <P x={130} y={G} child s={0.68} flip look={1} robe={C.redSoft} />
    <P x={146} y={G} child s={0.6} flip look={1} robe={C.steel} />
  </>
);

/** The brothers sit at Joseph's table from the firstborn to the youngest; Benjamin's mess is five times more. */
const FeastByAge = () => (
  <>
    {[
      [18, 0.86, 'dark', C.steel],
      [42, 0.8, 'dark', C.pale],
      [66, 0.74, 'dark', C.redSoft],
      [90, 0.68, 'dark', C.woodSoft],
      [112, 0.62, undefined, C.steelSoft],
    ].map(([x, s, beard, robe], i) => (
      <P key={i} x={x as number} y={96} s={s as number} look={1} beard={beard as 'dark' | undefined} robe={robe as string} />
    ))}
    <P x={138} y={96} child s={0.82} look={-1} mood="wow" robe={C.red} />
    <Table x1={6} x2={154} y={76} />
    {[18, 42, 66, 90, 112].map((x) => (
      <ellipse key={x} cx={x} cy={75} rx={6} ry={2.6} fill={C.bread} {...line} strokeWidth={1.8} />
    ))}
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${130} ${75 - i * 5} h16 l-3 5 h-10 Z`} fill={i % 2 ? C.bread : C.woodSoft} {...line} strokeWidth={1.8} />
    ))}
  </>
);

/** The steward finds the silver cup in Benjamin's sack; the brothers are dismayed. */
const CupSack = () => (
  <>
    <Ground />
    <Animal kind="donkey" x={22} y={G} s={0.66} />
    <Sack open x={84} y={G} s={1.05} />
    <P x={116} y={G} s={0.95} flip look={1} {...egyptian} robe={C.steelSoft} hands={[[-4, -26], [32, -56]]}>
      <CupSm x={32} y={-54} s={1.15} />
    </P>
    <P x={58} y={G} child s={1.05} look={1} mood="wow" robe={C.red} hands={[[-12, -50], [10, -52]]} />
    <P x={146} y={G} s={0.75} flip look={1} mood="cry" robe={C.pale} beard="dark" hands={[[2, -46], [8, -46]]} />
  </>
);

/** Joseph's wagons bring old Jacob and all his house down into Egypt. */
const Wagons = () => (
  <>
    <Hills />
    <Ground />
    <Animal kind="ox" x={128} y={G} s={0.82} />
    <path d="M94 86 L112 84" {...line} strokeWidth={3} />
    <P x={64} y={84} s={0.78} pose="sit" seat={false} look={1} {...oldJacob} />
    <path d="M40 66 Q70 46 100 66" fill="none" {...line} strokeWidth={2.6} />
    <path d="M40 66 V86 M100 66 V86" {...line} strokeWidth={2.6} />
    <path d="M40 66 Q70 46 100 66 V72 Q70 54 40 72 Z" fill={C.white} {...line} strokeWidth={2.2} />
    <rect x={36} y={80} width={68} height={12} rx={3} fill={C.wood} {...line} />
    <Wheel x={50} y={93} r={11} />
    <Wheel x={90} y={93} r={11} />
    <P x={16} y={G} s={0.72} look={1} pose="walk" woman robe={C.redSoft} headcloth={C.sand} />
  </>
);

/** The brothers lead the asses laden with the present / the good things of Egypt. */
const DonkeyGifts = () => (
  <>
    <Hills />
    <Ground />
    {[50, 116].map((x) => (
      <g key={x}>
        <Animal kind="donkey" x={x} y={G} s={0.82} />
        <rect x={x - 12} y={73} width={13} height={14} rx={4} fill={C.red} {...line} strokeWidth={2.2} />
        <rect x={x + 1} y={71} width={12} height={12} rx={4} fill={C.bread} {...line} strokeWidth={2.2} />
      </g>
    ))}
    <P x={86} y={G} s={0.82} pose="walk" look={1} robe={C.pale} beard="dark" headcloth={C.white} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-50} y2={0} />
    </P>
    <P x={150} y={G} s={0.8} pose="walk" look={1} robe={C.woodSoft} beard="dark" />
  </>
);

/** Old Jacob blesses Ephraim and Manasseh, crossing his hands. */
const CrossedHands = () => (
  <>
    <Ground />
    <path d="M6 104 V80 H76 V104" fill={C.woodSoft} {...line} />
    <P x={84} y={G} child s={1} flip look={1} robe={C.pale} />
    <P x={112} y={G} child s={0.75} flip look={1} robe={C.redSoft} />
    <P x={44} y={84} s={1} pose="sit" seat={false} look={1} {...oldJacob} hands={[[68, -13], [22, -20]]} />
    <path d="M66 64 L85 59" fill="none" {...line} strokeWidth={8} />
    <path d="M66 64 L85 59" fill="none" stroke={C.steel} strokeWidth={5} strokeLinecap="round" />
    <circle cx={85} cy={59} r={3.2} fill={C.skin} {...line} strokeWidth={1.6} />
    <P x={146} y={G} s={0.9} flip look={1} {...egyptian} />
  </>
);

export const SCENES_B = {
  angelsMeet: AngelsMeet,
  esau400: Esau400,
  wrestle: Wrestle,
  jacobBows: JacobBows,
  heapStones: HeapStones,
  simeonLevi: SimeonLevi,
  buryIdols: BuryIdols,
  mournOak: () => <Mourn />,
  mournAtad: () => <Mourn atad />,
  josephDreams: JosephDreams,
  reubenPit: ReubenPit,
  josephSold: JosephSold,
  coatBlood: CoatBlood,
  tamarSignet: TamarSignet,
  prison: Prison,
  pharaohDream: PharaohDream,
  josephChariot: JosephChariot,
  josephFamily: JosephFamily,
  granary: Granary,
  simeonBound: SimeonBound,
  pleadJacob: PleadJacob,
  feastByAge: FeastByAge,
  cupSack: CupSack,
  wagons: Wagons,
  donkeyGifts: DonkeyGifts,
  crossedHands: CrossedHands,
};

