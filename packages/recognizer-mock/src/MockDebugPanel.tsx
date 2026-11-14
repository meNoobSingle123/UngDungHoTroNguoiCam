import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WordId } from '@sign/recognizer-contract';
import type { MockEngine } from './MockEngine';
import { createMockDebugController } from './debugController';

export interface MockDebugPanelProps {
  engine: MockEngine;
}

/**
 * Dev-only debug panel allowing manual emission of candidate, locked, and unclear events.
 */
export function MockDebugPanel({ engine }: MockDebugPanelProps): React.ReactElement {
  const controller = useMemo(() => createMockDebugController(engine), [engine]);
  const [selectedWord, setSelectedWord] = useState<WordId>(controller.getSelectedWord());
  const [handPresent, setHandPresent] = useState<boolean>(engine.isHandPresent());

  const handleSelectWord = (word: WordId) => {
    controller.selectWord(word);
    setSelectedWord(word);
  };

  return (
    <View style={styles.container} testID="mock-debug-panel">
      <Text style={styles.title}>Bảng điều khiển gỡ lỗi (MOCK)</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wordRow}>
        {controller.availableWords.map((word) => {
          const active = word === selectedWord;
          return (
            <Pressable
              key={word}
              testID={`mock-word-${word}`}
              onPress={() => handleSelectWord(word)}
              style={[styles.wordChip, active && styles.wordChipActive]}
            >
              <Text style={[styles.wordChipText, active && styles.wordChipTextActive]}>
                {word}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.buttonRow}>
        <Pressable
          testID="mock-emit-candidate"
          onPress={() => controller.triggerCandidate()}
          style={[styles.actionBtn, styles.candidateBtn]}
        >
          <Text style={styles.actionText}>candidate</Text>
        </Pressable>

        <Pressable
          testID="mock-emit-locked"
          onPress={() => controller.triggerLocked()}
          style={[styles.actionBtn, styles.lockedBtn]}
        >
          <Text style={styles.actionText}>locked</Text>
        </Pressable>

        <Pressable
          testID="mock-emit-unclear"
          onPress={() => controller.triggerUnclear()}
          style={[styles.actionBtn, styles.unclearBtn]}
        >
          <Text style={styles.actionText}>unclear</Text>
        </Pressable>

        <Pressable
          testID="mock-toggle-hand"
          onPress={() => setHandPresent(controller.toggleHand())}
          style={[styles.actionBtn, styles.handBtn]}
        >
          <Text style={styles.actionText}>hand: {handPresent ? 'ON' : 'OFF'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(18, 18, 24, 0.92)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  title: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
  },
  wordRow: {
    flexDirection: 'row',
  },
  wordChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#27272A',
    marginRight: 6,
  },
  wordChipActive: {
    backgroundColor: '#F59E0B',
  },
  wordChipText: {
    color: '#E4E4E7',
    fontSize: 12,
  },
  wordChipTextActive: {
    color: '#18181B',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  candidateBtn: {
    backgroundColor: '#2563EB',
  },
  lockedBtn: {
    backgroundColor: '#16A34A',
  },
  unclearBtn: {
    backgroundColor: '#DC2626',
  },
  handBtn: {
    backgroundColor: '#52525B',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

