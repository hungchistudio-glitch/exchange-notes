import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCameraStream } from "@/hooks/camera/useCameraStream";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("releases a late camera request when the reader has already opened the photo picker", async () => {
  let resolve!: (stream: MediaStream) => void;
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }], getVideoTracks: () => [] } as unknown as MediaStream;
  const getUserMedia = vi.fn(() => new Promise<MediaStream>(done => { resolve = done; }));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const { result } = renderHook(() => useCameraStream());
  await act(async () => {});
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  act(() => result.current.suspend());
  await act(async () => { resolve(stream); });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(result.current.stream).toBeNull();
});

it("starts a fresh request after picker cancel without letting an old result replace it", async () => {
  const resolves: ((stream: MediaStream) => void)[] = [];
  const oldStop = vi.fn();
  const newStop = vi.fn();
  const oldStream = { getTracks: () => [{ stop: oldStop }], getVideoTracks: () => [] } as unknown as MediaStream;
  const newStream = { getTracks: () => [{ stop: newStop }], getVideoTracks: () => [] } as unknown as MediaStream;
  const getUserMedia = vi.fn(() => new Promise<MediaStream>(done => { resolves.push(done); }));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const { result } = renderHook(() => useCameraStream());
  await act(async () => {});
  act(() => { result.current.suspend(); result.current.resume(); });
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  await act(async () => { resolves[1](newStream); });
  await act(async () => { resolves[0](oldStream); });
  expect(oldStop).toHaveBeenCalledTimes(1);
  expect(newStop).not.toHaveBeenCalled();
  expect(result.current.stream).toBe(newStream);
  expect(result.current.status).toBe("live");
});

it("ignores a stale permission denial while a replacement request is pending", async () => {
  const rejects: ((error: unknown) => void)[] = [];
  const getUserMedia = vi.fn(() => new Promise<MediaStream>((_, reject) => { rejects.push(reject); }));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const { result } = renderHook(() => useCameraStream());
  await act(async () => {});
  act(() => { result.current.suspend(); result.current.resume(); });
  await act(async () => { rejects[0](new DOMException("denied", "NotAllowedError")); });
  expect(result.current.status).toBe("starting");
  act(() => result.current.retry());
  expect(getUserMedia).toHaveBeenCalledTimes(2);
});

it("releases a stream granted after unmount", async () => {
  let resolve!: (stream: MediaStream) => void;
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }], getVideoTracks: () => [] } as unknown as MediaStream;
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => new Promise<MediaStream>(done => { resolve = done; }) } });
  const view = renderHook(() => useCameraStream());
  await act(async () => {});
  view.unmount();
  await act(async () => { resolve(stream); });
  expect(stop).toHaveBeenCalledTimes(1);
});
