'use client';

import { useState, useEffect, useCallback } from 'react';

interface Room {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    students: number;
    items: number;
  };
}

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
  roomId: string;
  isRemoved: boolean;
}

interface Item {
  id: string;
  name: string;
  roomId: string;
  dueDate?: Date | null;
  isActive: boolean;
}

interface UseRoomResult {
  room: Room | null;
  students: Student[];
  items: Item[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addStudent: (name: string, seatNumber?: number) => Promise<Student | null>;
  addItem: (name: string, dueDate?: Date) => Promise<Item | null>;
}

export function useRoom(roomId: string): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [roomRes, studentsRes, itemsRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`),
        fetch(`/api/rooms/${roomId}/students`),
        fetch(`/api/rooms/${roomId}/items`),
      ]);

      if (!roomRes.ok) {
        throw new Error('找不到該房間');
      }

      setRoom(await roomRes.json());

      if (studentsRes.ok) {
        setStudents(await studentsRes.json());
      }

      if (itemsRes.ok) {
        setItems(await itemsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入房間資料失敗');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      fetchRoom();
    }
  }, [roomId, fetchRoom]);

  const addStudent = useCallback(
    async (name: string, seatNumber?: number): Promise<Student | null> => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, seatNumber }),
        });

        if (!response.ok) {
          throw new Error('新增學生失敗');
        }

        const student = await response.json();
        setStudents((prev) => [...prev, student]);
        return student;
      } catch (err) {
        setError(err instanceof Error ? err.message : '新增學生失敗');
        return null;
      }
    },
    [roomId]
  );

  const addItem = useCallback(
    async (name: string, dueDate?: Date): Promise<Item | null> => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dueDate }),
        });

        if (!response.ok) {
          throw new Error('新增項目失敗');
        }

        const item = await response.json();
        setItems((prev) => [...prev, item]);
        return item;
      } catch (err) {
        setError(err instanceof Error ? err.message : '新增項目失敗');
        return null;
      }
    },
    [roomId]
  );

  return {
    room,
    students,
    items,
    isLoading,
    error,
    refresh: fetchRoom,
    addStudent,
    addItem,
  };
}

export default useRoom;

