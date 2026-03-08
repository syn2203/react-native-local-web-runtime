import React, {useRef, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  LocalWebView,
  buildLocalWebEntryUrl,
  isLocalWebViewAvailable,
  type LocalWebBridgeEvent,
} from 'react-native-local-web-runtime';

type BridgeEnvelope = {
  v: number;
  id: string;
  source: 'rn' | 'web';
  type: string;
  payload?: unknown;
  ts: number;
};

type HighlightTarget = {
  label: string;
  x: number;
  y: number;
};

const MAX_LOG_COUNT = 8;
const DEFAULT_ENTRY_URL = buildLocalWebEntryUrl('web-dist', 'index.html');
const READY_MESSAGE_TYPES = new Set(['BRIDGE_READY', 'BRIDGE_PONG']);
const RUNTIME_FLAGS = {
  consumer: 'example-app',
  feature: 'local-web-demo',
  version: 1,
} as const;
const HIGHLIGHT_TARGETS: HighlightTarget[] = [
  {label: 'Mars', x: 0.72, y: 0.44},
  {label: 'Saturn', x: 0.32, y: 0.58},
  {label: 'Vega', x: 0.56, y: 0.24},
];

const RN_POINTS = [
  'The title, cards, buttons, and logs below are React Native views.',
  'This layer owns the native bridge and sends JSON messages to the web page.',
  'Rebuilding iOS or Android is required when the native view changes.',
];

const WEB_POINTS = [
  'Everything inside the framed viewport is bundled HTML, CSS, and JavaScript.',
  'That page receives bridge events and updates its own DOM tree.',
  'The web page does not know about the RN layout outside the viewport.',
];

function buildEnvelope(
  id: string,
  type: string,
  payload?: unknown,
): BridgeEnvelope {
  return {
    v: 1,
    id,
    source: 'rn',
    type,
    payload,
    ts: Date.now(),
  };
}

function parseEnvelope(raw: string): BridgeEnvelope | null {
  try {
    return JSON.parse(raw) as BridgeEnvelope;
  } catch {
    return null;
  }
}

function formatTimeLabel() {
  return new Date().toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function readPayloadText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const text = (payload as {text?: unknown}).text;
  return typeof text === 'string' && text.length > 0 ? text : null;
}

export function LocalWebDemoScreen() {
  const insets = useSafeAreaInsets();
  const messageIndexRef = useRef(0);
  const highlightIndexRef = useRef(0);
  const [bridgeStatus, setBridgeStatus] = useState('Waiting for H5 reply');
  const [outboundMessage, setOutboundMessage] = useState('');
  const [lastInboundType, setLastInboundType] = useState('-');
  const [lastOutboundType, setLastOutboundType] = useState('-');
  const [inboundCount, setInboundCount] = useState(0);
  const [outboundCount, setOutboundCount] = useState(0);
  const [lastWebNote, setLastWebNote] = useState('No note from H5 yet.');
  const [logs, setLogs] = useState<string[]>([]);

  function pushLog(line: string) {
    const timestamp = formatTimeLabel();
    setLogs(current => [...current, `[${timestamp}] ${line}`].slice(-MAX_LOG_COUNT));
  }

  function sendMessage(type: string, payload?: unknown) {
    messageIndexRef.current += 1;

    const serialized = JSON.stringify(
      buildEnvelope(`rn-${Date.now()}-${messageIndexRef.current}`, type, payload),
    );

    setOutboundMessage(serialized);
    setLastOutboundType(type);
    setOutboundCount(current => current + 1);
    pushLog(`RN -> H5 ${type}`);
  }

  function sendNextHighlight() {
    const target = HIGHLIGHT_TARGETS[highlightIndexRef.current];
    highlightIndexRef.current =
      (highlightIndexRef.current + 1) % HIGHLIGHT_TARGETS.length;

    sendMessage('SET_HIGHLIGHT', target);
  }

  function handleBridgeMessage(event: NativeSyntheticEvent<LocalWebBridgeEvent>) {
    const raw = event.nativeEvent?.data;

    if (!raw) {
      return;
    }

    const message = parseEnvelope(raw);

    if (!message) {
      pushLog('H5 -> RN invalid JSON');
      return;
    }

    setLastInboundType(message.type);
    setInboundCount(current => current + 1);
    pushLog(`H5 -> RN ${message.type}`);

    if (READY_MESSAGE_TYPES.has(message.type)) {
      setBridgeStatus('Connected');
      return;
    }

    switch (message.type) {
      case 'H5_PING_RN':
        setBridgeStatus('H5 pinged RN');
        sendMessage('RN_ACK', {
          forType: message.type,
          text: 'RN received the H5 ping.',
        });
        return;
      case 'H5_REQUEST_TIME':
        setBridgeStatus('H5 requested the current time');
        sendMessage('SET_TIME', {
          iso8601Utc: new Date().toISOString(),
        });
        return;
      case 'H5_REQUEST_TARGET':
        setBridgeStatus('H5 requested a new target');
        sendNextHighlight();
        return;
      case 'H5_SEND_NOTE': {
        const note = readPayloadText(message.payload) || 'H5 sent a note.';
        setBridgeStatus('RN stored a note from H5');
        setLastWebNote(note);
        sendMessage('RN_ACK', {
          forType: message.type,
          text: `RN stored: ${note}`,
        });
        return;
      }
      default:
        return;
    }
  }

  const actions = [
    {
      caption: 'Ask H5 to reply',
      label: 'Ping',
      onPress: () =>
        sendMessage('BRIDGE_PING', {
          text: 'hello from react native',
        }),
    },
    {
      caption: 'Move the H5 target',
      label: 'Highlight',
      onPress: () => sendNextHighlight(),
    },
    {
      caption: 'Update H5 copy',
      label: 'Time',
      onPress: () =>
        sendMessage('SET_TIME', {
          iso8601Utc: new Date().toISOString(),
        }),
    },
    {
      caption: 'Push a visible note into H5',
      label: 'Note',
      onPress: () =>
        sendMessage('SET_NOTE', {
          text: 'React Native pushed this note into the embedded H5 page.',
        }),
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 18),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Example App</Text>
          <Text style={styles.title}>React Native outside. H5 inside.</Text>
          <Text style={styles.subtitle}>
            This screen is the React Native layer. The framed area below is the
            bundled local H5 page rendered by <Text style={styles.code}>LocalWebView</Text>.
          </Text>
        </View>

        <View style={styles.compareRow}>
          <CompareCard
            accentStyle={styles.rnAccent}
            badge="RN"
            title="React Native layer"
            points={RN_POINTS}
          />
          <CompareCard
            accentStyle={styles.webAccent}
            badge="H5"
            title="Local web layer"
            points={WEB_POINTS}
          />
        </View>

        <View style={styles.viewportSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>Embedded H5 viewport</Text>
              <Text style={styles.sectionTitle}>Local HTML page running in the app</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillLabel}>
                {isLocalWebViewAvailable ? 'Native linked' : 'Needs rebuild'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionBody}>
            Use the RN buttons below and the H5 buttons inside the viewport.
            Each side now sends actions to the other and both sides keep their
            own state and logs.
          </Text>

          <Text style={styles.entryUrl}>{DEFAULT_ENTRY_URL}</Text>

          <View style={styles.viewportFrame}>
            <LocalWebView
              assetRoot="web-dist"
              bridgeEnabled
              entryFile="index.html"
              onBridgeMessage={handleBridgeMessage}
              outboundMessage={outboundMessage}
              runtimeFlags={RUNTIME_FLAGS}
              style={styles.viewport}
            />
            <View pointerEvents="none" style={styles.viewportOverlay}>
              <View style={styles.viewportBadge}>
                <Text style={styles.viewportBadgeText}>H5 surface starts here</Text>
              </View>
            </View>
          </View>

          {!isLocalWebViewAvailable ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Native package not in current build</Text>
              <Text style={styles.noticeBody}>
                JavaScript can resolve the package, but the native view manager
                only appears after a full iOS or Android rebuild.
              </Text>
            </View>
          ) : null}
        </View>

        <SectionCard
          eyebrow="RN state"
          title="What RN knows about the bridge"
          body="These values live in React Native state. They update when the H5 page sends messages back through the native bridge.">
          <View style={styles.metricsRow}>
            <MetricCard label="Bridge" value={bridgeStatus} />
            <MetricCard label="RN -> H5" value={`${outboundCount} sent`} />
            <MetricCard label="H5 -> RN" value={`${inboundCount} sent`} />
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Last H5 note seen by RN</Text>
            <Text style={styles.noteValue}>{lastWebNote}</Text>
          </View>
        </SectionCard>

        <SectionCard
          eyebrow="RN controls"
          title="Send messages from React Native to H5"
          body="These buttons are React Native components. The H5 page inside the viewport reacts immediately and updates its own DOM.">
          <View style={styles.buttonGrid}>
            {actions.map(action => (
              <ActionButton
                key={action.label}
                label={action.label}
                caption={action.caption}
                onPress={action.onPress}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          eyebrow="Bridge status"
          title="Current message flow"
          body="This summary is rendered by RN. Compare it with the H5 log inside the viewport to see both sides updating independently.">
          <View style={styles.metricsRow}>
            <MetricCard label="Bridge" value={bridgeStatus} />
            <MetricCard label="RN -> H5" value={lastOutboundType} />
            <MetricCard label="H5 -> RN" value={lastInboundType} />
          </View>
        </SectionCard>

        <SectionCard
          eyebrow="RN log"
          title="Recent bridge events observed by React Native"
          body="These lines are owned by RN state only. Use the H5 buttons inside the viewport and you should see this log update without changing the H5 log layout.">
          {logs.length === 0 ? (
            <Text style={styles.emptyState}>No messages yet.</Text>
          ) : (
            logs.map(line => (
              <Text key={line} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

function CompareCard({
  accentStyle,
  badge,
  title,
  points,
}: {
  accentStyle: object;
  badge: string;
  title: string;
  points: string[];
}) {
  return (
    <View style={styles.compareCard}>
      <View style={[styles.compareAccent, accentStyle]} />
      <Text style={styles.compareBadge}>{badge}</Text>
      <Text style={styles.compareTitle}>{title}</Text>
      {points.map(point => (
        <Text key={point} style={styles.comparePoint}>
          {point}
        </Text>
      ))}
    </View>
  );
}

function SectionCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionLabel}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
      {children}
    </View>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  caption,
  onPress,
}: {
  label: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
      <Text style={styles.buttonCaption}>{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f3efe7',
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  hero: {
    marginBottom: 18,
  },
  kicker: {
    color: '#915f18',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1b1f28',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: '#5f6879',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 500,
  },
  code: {
    color: '#23417d',
    fontFamily: 'Menlo',
  },
  compareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 18,
  },
  compareCard: {
    backgroundColor: '#fffaf2',
    borderColor: '#dccfbf',
    borderRadius: 22,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 260,
    marginHorizontal: 6,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 18,
  },
  compareAccent: {
    borderRadius: 999,
    height: 6,
    marginBottom: 14,
    width: 52,
  },
  rnAccent: {
    backgroundColor: '#d98c2b',
  },
  webAccent: {
    backgroundColor: '#2e5bca',
  },
  compareBadge: {
    color: '#7f6f5a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  compareTitle: {
    color: '#1c2230',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  comparePoint: {
    color: '#5e6776',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  viewportSection: {
    marginBottom: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#8a6735',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#1b1f28',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    marginBottom: 8,
  },
  sectionBody: {
    color: '#5d6677',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  statusPill: {
    backgroundColor: '#ffffff',
    borderColor: '#d9d2c6',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillLabel: {
    color: '#374154',
    fontSize: 12,
    fontWeight: '800',
  },
  entryUrl: {
    backgroundColor: '#ece5d7',
    borderRadius: 12,
    color: '#43506a',
    fontFamily: 'Menlo',
    fontSize: 12,
    marginBottom: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewport: {
    backgroundColor: '#0e1729',
    height: 420,
  },
  viewportFrame: {
    backgroundColor: '#0e1729',
    borderColor: '#101728',
    borderRadius: 26,
    borderWidth: 1,
    height: 420,
    overflow: 'hidden',
    position: 'relative',
  },
  viewportOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    padding: 16,
  },
  viewportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11, 16, 31, 0.68)',
    borderColor: 'rgba(153, 178, 238, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewportBadgeText: {
    color: '#e5ecff',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    backgroundColor: '#fff7f2',
    borderColor: '#e2b591',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeTitle: {
    color: '#44220f',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeBody: {
    color: '#7c5745',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionCard: {
    backgroundColor: '#fffaf2',
    borderColor: '#dccfbf',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#ffffff',
    borderColor: '#d8cfbf',
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    marginHorizontal: 4,
    marginBottom: 8,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#1e2431',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  buttonCaption: {
    color: '#687387',
    fontSize: 12,
    lineHeight: 17,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd4c7',
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: 110,
    flexGrow: 1,
    marginHorizontal: 5,
    marginTop: 2,
    padding: 14,
  },
  metricLabel: {
    color: '#7d715e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#1b2230',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd4c7',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  noteLabel: {
    color: '#7d715e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  noteValue: {
    color: '#2a3344',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    color: '#6c7484',
    fontSize: 13,
    lineHeight: 19,
  },
  logLine: {
    color: '#4f5c73',
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 5,
  },
});
