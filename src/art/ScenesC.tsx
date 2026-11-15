import { C, Ground, INK, Person as P, Waves, line } from './kit';
import { Animal, Earth, HarpSm, Hills, Horn, Light, Night, Oak, Palm, StarPt, Stick, SwordSm, TentSm, Throne, Town, WellSm } from './sceneKit';
import { G } from './ScenesA';

/*
 * Scene pictures, part 3: Abram under the stars, Jacob's pillar, Moses, the judges, the kings,
 * and David's life as told in the titles of the Psalms.
 */

const david = { robe: C.red, beard: 'dark', hair: C.wood } as const;
const king = { ...david, crown: true } as const;

/** Two music notes. */
const Notes = ({ x, y }: { x: number; y: number }) => (
  <g>
    <path d={`M${x} ${y} V${y - 14} L${x + 10} ${y - 17} V${y - 3}`} fill="none" {...line} strokeWidth={2.2} />
    <ellipse cx={x - 2.5} cy={y} rx={3.5} ry={2.6} fill={INK} />
    <ellipse cx={x + 7.5} cy={y - 3} rx={3.5} ry={2.6} fill={INK} />
    <path d={`M${x + 20} ${y - 22} V${y - 34} q4 2 6 6`} fill="none" {...line} strokeWidth={2.2} />
    <ellipse cx={x + 17.5} cy={y - 22} rx={3.5} ry={2.6} fill={INK} />
  </g>
);

/** God brings Abram outside: "Look now toward heaven, and tell the stars." */
const CountStars = () => (
  <>
    <Night />
    {[[70, 18], [92, 30], [110, 14], [132, 28], [148, 46], [84, 50], [120, 50], [100, 64], [140, 70], [60, 40], [30, 20], [46, 30]].map(([x, y], i) => (
      <StarPt key={i} x={x} y={y} r={i % 3 ? 3.4 : 4.6} />
    ))}
    <Earth y={98} />
    <TentSm x={30} y={102} s={0.95} />
    <P x={78} y={104} s={0.95} look={1} robe={C.steel} beard="dark" headcloth={C.white} hands={[[-10, -20], [22, -68]]} />
  </>
);

/** Jacob sets up the stone of his pillow for a pillar and pours oil upon it (Bethel). */
const JacobPillar = () => (
  <>
    <Light x={136} y={24} r={11} />
    <Hills />
    <Ground />
    <rect x={92} y={56} width={18} height={48} rx={6} fill={C.steelSoft} {...line} />
    <P x={58} y={G} s={0.95} look={1} robe={C.steel} beard="dark" hands={[[16, -36], [28, -62]]}>
      <Horn x={28} y={-62} r={55} s={1.15} />
    </P>
    <path d="M101 50 q-2.5 5 0 7 q2.5 -2 0 -7 Z" fill={C.bread} {...line} strokeWidth={1.6} />
  </>
);

/** Elkanah comforts Hannah as she prays at the house of the LORD in Shiloh. */
const HannahElkanah = () => (
  <>
    <TentSm x={128} y={G} s={1.25} fill={C.white} />
    <Ground />
    <P x={84} y={G} s={0.9} pose="kneel" look={1} mood="cry" woman robe={C.pale} headcloth={C.steelSoft} hands={[[16, -56], [20, -54]]} />
    <P x={40} y={G} s={0.95} look={1} robe={C.woodSoft} beard="dark" headcloth={C.white} hands={[null, [32, -30]]} />
  </>
);

/** The child Samuel ministers in the house of the LORD by night, beside the lamp of God. */
const SamuelLamp = () => (
  <>
    <Night />
    <rect x={14} y={14} width={40} height={84} rx={4} fill={C.red} opacity={0.75} />
    <path d="M24 14 V98 M34 14 V98 M44 14 V98" {...line} strokeWidth={1.6} opacity={0.4} />
    <Earth y={98} />
    <path d="M102 104 L112 96 L122 104 Z M112 96 V60" fill={C.bread} {...line} />
    <path d="M100 60 H124 Q122 68 112 68 Q102 68 100 60 Z" fill={C.bread} {...line} strokeWidth={2.4} />
    <path d="M112 58 q-6 -8 0 -16 q6 8 0 16 Z" fill={C.red} {...line} strokeWidth={2} />
    <P x={76} y={104} child s={1.25} look={1} robe={C.white} sash={C.steel} hands={[[-10, -20], [30, -44]]} />
  </>
);

/** Ehud, the left-handed judge, brings the present to fat king Eglon, his dagger hidden. */
const Ehud = () => (
  <>
    <Ground />
    <Throne x={124} y={G} flip />
    <P x={124} y={G} s={1} flip pose="sit" seat={false} look={1} robe={C.red} crown beard="dark" hands={[[-4, -20], [16, -36]]}>
      <path d="M2 -39 Q30 -32 20 -8 H4 Z" fill={C.red} {...line} />
      <circle cx={16} cy={-36} r={3.2} fill={C.skin} {...line} strokeWidth={1.6} />
    </P>
    <P x={50} y={G} s={0.95} look={1} robe={C.pale} beard="dark" headcloth={C.white} hands={[[-14, -16], [26, -34]]}>
      <SwordSm x={-14} y={-16} r={200} s={0.55} />
      <path d="M20 -34 q0 -10 6 -12 q6 2 6 12 q-6 4 -12 0 Z" fill={C.woodSoft} {...line} strokeWidth={2} />
    </P>
  </>
);

/** Deborah judges Israel, sitting under her palm tree in mount Ephraim. */
const DeborahPalm = () => (
  <>
    <Hills />
    <Palm x={120} y={G} s={1.2} />
    <Ground />
    <P x={112} y={G} s={0.95} flip pose="sit" look={1} woman robe={C.steel} headcloth={C.white} hands={[[-4, -20], [24, -42]]} />
    <P x={38} y={G} s={0.9} look={1} robe={C.woodSoft} beard="dark" hands={[[-12, -22], [18, -30]]} />
    <P x={64} y={G} s={0.8} look={1} woman robe={C.redSoft} headcloth={C.sand} />
  </>
);

/** Zadok anoints Solomon king with the horn of oil, and they blow the trumpet. */
const SolomonCrowned = () => (
  <>
    <Ground />
    <P x={56} y={G} s={0.95} pose="kneel" look={1} robe={C.red} crown hands={[[10, -26], [14, -24]]} />
    <P x={96} y={G} s={0.95} flip look={1} robe={C.white} sash={C.steel} beard="white" headcloth={C.steel} hands={[[-6, -22], [34, -60]]}>
      <Horn x={34} y={-60} r={30} s={1.3} />
    </P>
    <path d="M58 52 q-2 4 0 6 q2 -2 0 -6 Z M62 44 q-2 4 0 6 q2 -2 0 -6 Z" fill={C.bread} {...line} strokeWidth={1.6} />
    <P x={136} y={G} s={0.88} flip look={1} robe={C.pale} headcloth={C.white} hands={[[-6, -22], [12, -48]]}>
      <Horn x={8} y={-48} r={-30} s={1.2} />
    </P>
  </>
);

/** Moses waters the flock of Jethro's daughters at the well; Zipporah watches. */
const MosesWell = () => (
  <>
    <Hills />
    <Ground />
    <WellSm x={74} y={G} />
    <P x={40} y={G} s={0.95} look={1} robe={C.steel} beard="dark" hands={[[22, -36], [28, -40]]} lean={14}>
      <path d="M22 -42 h10 l-2 10 h-6 Z" fill={C.wood} {...line} strokeWidth={2} />
    </P>
    <Animal x={100} y={G} s={0.6} flip />
    <P x={124} y={G} s={0.88} flip look={1} woman robe={C.redSoft} headcloth={C.white} hands={[null, [14, -30]]}>
      <Stick crook x={15} y1={-54} y2={0} />
    </P>
    <P x={148} y={G} s={0.74} flip look={1} woman robe={C.pale} headcloth={C.sand} />
  </>
);

/** Moses with his wife Zipporah and their two sons, Gershom and Eliezer. */
const MosesSons = () => (
  <>
    <path d="M90 104 L124 44 L156 104 Z" fill={C.paleDeep} opacity={0.5} />
    <Ground />
    <P x={24} y={G} s={0.86} look={1} woman robe={C.redSoft} headcloth={C.white} />
    <P x={60} y={G} s={0.98} look={1} robe={C.steel} beard="dark" headcloth={C.white} hands={[[-12, -22], [30, -44]]}>
      <Stick x={-12} y1={-60} y2={0} />
    </P>
    <P x={92} y={G} child s={1} flip look={1} robe={C.pale} />
    <P x={116} y={G} child s={0.82} flip look={1} robe={C.bread} />
  </>
);

/** King David sits and plays his harp. */
const DavidHarp = () => (
  <>
    <Hills />
    <Ground />
    <path d="M28 104 Q28 86 48 86 Q68 86 68 104 Z" fill={C.steelSoft} {...line} />
    <P x={52} y={87} s={0.95} pose="sit" seat={false} look={1} {...king} hands={[[12, -30], [24, -24]]}>
      <HarpSm x={16} y={-12} s={1.1} />
    </P>
    <Notes x={100} y={50} />
    <Animal x={132} y={G} s={0.7} flip />
  </>
);

/** The Levite singers praise God in the temple with harp, cymbals and song. */
const TempleSingers = () => (
  <>
    <rect x={14} y={20} width={14} height={84} fill={C.sand} {...line} />
    <rect x={132} y={20} width={14} height={84} fill={C.sand} {...line} />
    <rect x={8} y={12} width={144} height={10} rx={2} fill={C.sand} {...line} />
    <Ground />
    <P x={48} y={G} s={0.88} look={1} mood="wow" robe={C.white} sash={C.steel} hands={[[-14, -56], [16, -58]]}>
      <ellipse cx={-14} cy={-59} rx={6} ry={2.4} fill={C.bread} {...line} strokeWidth={1.8} transform="rotate(-30 -14 -59)" />
      <ellipse cx={16} cy={-61} rx={6} ry={2.4} fill={C.bread} {...line} strokeWidth={1.8} transform="rotate(30 16 -61)" />
    </P>
    <P x={82} y={G} s={0.88} look={1} robe={C.white} sash={C.red} beard="dark" hands={[[12, -30], [22, -26]]}>
      <HarpSm x={14} y={-10} s={1.05} />
    </P>
    <P x={114} y={G} s={0.88} flip look={1} mood="wow" robe={C.white} sash={C.pale} beard="white" />
    <Notes x={64} y={34} />
  </>
);

/** Families go up to Jerusalem for the feasts, singing the Songs of degrees. */
const Pilgrims = () => (
  <>
    <path d="M8 104 Q60 100 104 58 Q122 40 152 40 V104 Z" fill={C.pale} opacity={0.55} />
    <Town x={130} y={42} s={1.05} />
    <path d="M6 112 Q60 104 96 76 Q110 64 122 50" fill="none" stroke={C.sand} strokeWidth={16} strokeLinecap="round" />
    <P x={92} y={80} s={0.72} pose="walk" look={1} robe={C.steel} beard="dark" headcloth={C.white} hands={[null, [16, -30]]}>
      <Stick x={17} y1={-54} y2={0} />
    </P>
    <P x={62} y={98} s={0.8} pose="walk" look={1} woman robe={C.redSoft} headcloth={C.sand} />
    <P x={34} y={110} child s={1.05} pose="walk" look={1} robe={C.pale} mood="wow" />
    <Notes x={30} y={46} />
  </>
);

/** David flees from Absalom up the mount of Olives, head covered, weeping, his men with him. */
const DavidFlees = () => (
  <>
    <path d="M8 104 L8 70 Q60 52 152 92 V104 Z" fill={C.pale} opacity={0.55} />
    <Oak x={26} y={78} s={0.55} />
    <Ground />
    <P x={52} y={G} s={0.95} flip pose="walk" look={1} mood="cry" robe={C.red} beard="dark" headcloth={C.steelSoft} />
    <P x={92} y={G} s={0.85} flip pose="walk" look={1} mood="sad" robe={C.woodSoft} beard="dark" headcloth={C.white} />
    <P x={126} y={G} s={0.8} flip pose="walk" look={1} mood="sad" robe={C.pale} headcloth={C.white} hands={[null, [14, -30]]}>
      <Stick tip x={15} y1={-62} y2={0} />
    </P>
  </>
);

/** Saul's men watch David's house; Michal lets him down through a window by night. */
const DavidWindow = () => (
  <>
    <Night />
    <Earth y={98} />
    <path d="M70 104 V24 H152 V104 Z" fill={C.sand} {...line} />
    <rect x={96} y={30} width={30} height={26} rx={3} fill={C.night} {...line} />
    <clipPath id="cp-michal">
      <rect x={97.5} y={31.5} width={27} height={23} />
    </clipPath>
    <g clipPath="url(#cp-michal)">
      <P x={110} y={84} s={0.7} look={-1} woman robe={C.pale} headcloth={C.white} hands={[[-4, -30], [6, -30]]} />
    </g>
    <path d="M100 56 H122" {...line} strokeWidth={4} />
    <path d="M110 56 V68" {...line} stroke={C.bread} strokeWidth={2.4} />
    <P x={110} y={102} s={0.72} pose="raise" look={-1} robe={C.red} beard="dark" hands={[[-2, -62], [2, -60]]} />
    <P x={30} y={104} s={0.85} flip look={1} robe={C.steel} headcloth={C.steelSoft} hands={[null, [14, -30]]}>
      <Stick tip x={15} y1={-62} y2={0} />
    </P>
  </>
);

/** At Gath, David feigns madness before the king, scrabbling on the doors of the gate. */
const DavidMad = () => (
  <>
    <path d="M66 104 V22 H154 V104 Z" fill={C.sand} {...line} />
    <path d="M66 22 V14 H78 V22 M90 22 V14 H102 V22 M114 22 V14 H126 V22 M138 22 V14 H150 V22" fill={C.sand} {...line} strokeWidth={2.4} />
    <path d="M86 104 V58 Q110 34 134 58 V104 Z" fill={C.wood} {...line} />
    <path d="M110 46 V104 M98 62 V104 M122 62 V104" {...line} strokeWidth={1.8} opacity={0.5} />
    <Ground />
    <P x={78} y={G} s={0.95} look={1} mood="wow" robe={C.red} beard="dark" hands={[[22, -58], [26, -44]]} />
    <path d="M86 70 v6" stroke={C.steelSoft} strokeWidth={2.4} strokeLinecap="round" />
    <P x={30} y={G} s={0.92} look={1} mood="wow" robe={C.steel} crown hands={[[-10, -24], [10, -52]]} />
  </>
);

/** David hides in the cave from Saul and prays. */
const DavidCave = () => (
  <>
    <path d="M6 104 Q8 20 80 14 Q152 20 154 104 Z" fill={C.sand} {...line} />
    <path d="M24 104 Q28 40 80 36 Q132 40 136 104 Z" fill={C.night} {...line} />
    <P x={100} y={102} s={0.66} pose="sit" seat={false} look={-1} robe={C.woodSoft} beard="dark" />
    <P x={120} y={102} s={0.6} pose="sit" seat={false} look={-1} robe={C.pale} />
    <P x={62} y={102} s={0.95} pose="kneel" look={1} robe={C.red} beard="dark" hands={[[-14, -58], [14, -58]]} />
    <path d="M6 104 H154" {...line} />
  </>
);

/** Nathan the prophet points at King David: "Thou art the man." */
const NathanDavid = () => (
  <>
    <Ground />
    <Throne x={118} y={G} flip />
    <P x={118} y={G} s={1} flip pose="sit" seat={false} look={1} mood="cry" {...king} hands={[[-2, -26], [6, -34]]} />
    <P x={42} y={G} s={1} pose="point" look={1} robe={C.steelSoft} beard="white" headcloth={C.white} />
  </>
);

/** David prays in the dry wilderness of Judah. */
const DavidPray = () => (
  <>
    <Light x={130} y={24} r={12} />
    <path d="M8 104 Q36 80 70 92 Q104 74 152 88 V104 Z" fill={C.sand} {...line} strokeWidth={2.4} />
    <path d="M128 104 v-10 m0 4 l-6 -6 m6 2 l6 -7 M24 104 v-8 l-5 -5 m5 3 l5 -4" fill="none" {...line} strokeWidth={2.2} />
    <Ground />
    <P x={70} y={G} s={1} pose="kneel" look={1} robe={C.red} beard="dark" headcloth={C.white} hands={[[-14, -58], [14, -60]]} />
  </>
);

/** By the rivers of Babylon the captives sit and weep, their harps hung on the willows. */
const BabylonRivers = () => (
  <>
    <path d="M110 92 V40" {...line} strokeWidth={9} />
    <path d="M110 92 V40" stroke={C.wood} strokeWidth={6} strokeLinecap="round" />
    <path d="M110 42 Q90 30 76 46 M110 42 Q130 30 146 50 M110 40 Q104 22 88 26 M110 40 Q118 22 134 28" fill="none" {...line} strokeWidth={3} />
    <path d="M76 46 V76 M88 26 Q84 50 86 70 M146 50 V80 M134 28 Q138 50 136 72 M98 34 V64 M124 34 V62" fill="none" stroke={C.paleDeep} strokeWidth={3} strokeLinecap="round" />
    <HarpSm x={84} y={70} s={0.75} />
    <HarpSm x={124} y={78} s={0.75} />
    <path d="M6 94 H90 Q100 96 104 102" fill="none" {...line} />
    <Waves y={102} />
    <P x={30} y={94} s={0.82} pose="sit" seat={false} look={1} mood="cry" robe={C.pale} beard="dark" />
    <P x={60} y={94} s={0.78} pose="sit" seat={false} look={1} mood="cry" woman robe={C.redSoft} headcloth={C.sand} />
  </>
);

/** A man comes and tells King Saul where David is (Doeg the Edomite, the Ziphites, Cush). */
const TellSaul = () => (
  <>
    <Ground />
    <Throne x={44} y={G} />
    <P x={44} y={G} s={1} pose="sit" seat={false} look={1} mood="angry" robe={C.steel} beard="dark" crown hands={[[-12, -30], [16, -24]]}>
      <Stick tip x={-12} y1={-74} y2={0} />
    </P>
    <P x={108} y={G} s={0.95} flip pose="bowStand" lean={22} look={1} robe={C.woodSoft} beard="dark" headcloth={C.red} hands={[[10, -30], [30, -44]]} />
    <path d="M78 40 q-4 -3 -8 0 M80 32 q-6 -5 -12 0" fill="none" {...line} strokeWidth={2} />
  </>
);

export const SCENES_C = {
  countStars: CountStars,
  jacobPillar: JacobPillar,
  hannahElkanah: HannahElkanah,
  samuelLamp: SamuelLamp,
  ehud: Ehud,
  deborahPalm: DeborahPalm,
  solomonCrowned: SolomonCrowned,
  mosesWell: MosesWell,
  mosesSons: MosesSons,
  davidHarp: DavidHarp,
  templeSingers: TempleSingers,
  pilgrims: Pilgrims,
  davidFlees: DavidFlees,
  davidWindow: DavidWindow,
  davidMad: DavidMad,
  davidCave: DavidCave,
  nathanDavid: NathanDavid,
  davidPray: DavidPray,
  babylonRivers: BabylonRivers,
  tellSaul: TellSaul,
};

