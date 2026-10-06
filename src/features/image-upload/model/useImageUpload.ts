import { serializeApiError } from "@/shared/lib/errorHandler";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  revokeImagePreview,
  createImagePreview,
  validateImage,
} from "@/shared/lib";
import { imageApi, type ImageTag } from "@/entities/image";
import { usePrivateScope } from "@/shared/lib/query";

type ImageSelection =
  | { kind: "unchanged" | "explicitlyRemoved" }
  | { kind: "uploaded"; file: File; preview: string; id: number };

type ImageUploadState = {
  status: "unchanged" | "uploading" | "uploaded" | "failed" | "explicitlyRemoved";
  selection: ImageSelection;
  error: string | null;
};

export interface UseImageUploadReturn {
  image: File | null;
  imagePreview: string | null;
  imageError: string | null;
  imageIds: number[];
  isUploading: boolean;
  imageState: ImageUploadState;
  getImageState: () => ImageUploadState;
  handleImageChange: (file: File) => Promise<void>;
  resetImageState: () => void;
  removeImage: () => void;
}

export const useImageUpload = (tag: ImageTag): UseImageUploadReturn => {
  const scope = usePrivateScope();
  const [state, setState] = useState<ImageUploadState>({
    status: "unchanged", selection: { kind: "unchanged" }, error: null,
  });
  const current = useRef(state);
  const revision = useRef(0);
  const mounted = useRef(true);

  const updateState = useCallback((next: ImageUploadState) => {
    const previous = current.current.selection;
    if (previous.kind === "uploaded" &&
      (next.selection.kind !== "uploaded" || previous.preview !== next.selection.preview)) {
      // Очищаем предыдущий preview
      revokeImagePreview(previous.preview);
    }
    current.current = next;
    setState(next);
  }, []);

  // Очистка preview при размонтировании
  useEffect(() => {
    const uploadRevision = revision;
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadRevision.current++;
      const selection = current.current.selection;
      if (selection.kind === "uploaded") revokeImagePreview(selection.preview);
    };
  }, []);

  const resetImageState = useCallback(() => {
    revision.current++;
    updateState({ status: "unchanged", selection: { kind: "unchanged" }, error: null });
  }, [updateState]);

  const removeImage = useCallback(() => {
    revision.current++;
    updateState({ status: "explicitlyRemoved", selection: { kind: "explicitlyRemoved" }, error: null });
  }, [updateState]);

  const handleImageChange = useCallback(
    async (file: File): Promise<void> => {
      if (!mounted.current || !scope.isCurrent()) return;
      const uploadRevision = ++revision.current;
      const selection = current.current.selection;
      const validation = validateImage(file);

      if (!validation.isValid) {
        updateState({ status: "failed", selection, error: validation.error ?? "Invalid image" });
        return;
      }

      updateState({ status: "uploading", selection, error: null });
      const isCurrent = () => mounted.current && scope.isCurrent() && revision.current === uploadRevision;

      // Загружаем на сервер
      try {
        const response = await imageApi.saveImage(file, tag);
        if (!isCurrent()) return;
        updateState({
          status: "uploaded",
          selection: { kind: "uploaded", file, preview: createImagePreview(file), id: response[0] },
          error: null,
        });
      } catch (error) {
        if (!isCurrent()) return;
        console.error("Ошибка при загрузке изображения:", serializeApiError(error));
        updateState({ status: "failed", selection, error: "Не удалось загрузить изображение на сервер" });
      }
    },
    [tag, scope, updateState],
  );

  const getImageState = useCallback(() => current.current, []);
  const selection = state.selection;
  return {
    image: selection.kind === "uploaded" ? selection.file : null,
    imagePreview: selection.kind === "uploaded" ? selection.preview : null,
    imageError: state.error,
    imageIds: selection.kind === "uploaded" ? [selection.id] : [],
    isUploading: state.status === "uploading",
    imageState: state,
    getImageState,
    handleImageChange,
    resetImageState,
    removeImage,
  };
};
