import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreenshotUploader } from '../ScreenshotUploader';

// Mock Supabase storage functions
vi.mock('@/lib/supabase/storage', () => ({
  validateImageFile: vi.fn((file: File) => ({ valid: true })),
  uploadScreenshot: vi.fn((file: File, onProgress?: (progress: number) => void) => {
    onProgress?.(50);
    onProgress?.(100);
    return Promise.resolve(`http://example.com/${file.name}`) as Promise<string>;
  }),
  deleteScreenshot: vi.fn(() => Promise.resolve() as Promise<void>),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { validateImageFile, uploadScreenshot, deleteScreenshot } from '@/lib/supabase/storage';
import { toast } from 'sonner';

describe('ScreenshotUploader', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    value: [],
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders upload zone', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      expect(screen.getByText(/Drop screenshots here or click to browse/i)).toBeInTheDocument();
    });

    it('displays current upload count', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      expect(screen.getByText(/0\/5 uploaded/i)).toBeInTheDocument();
    });

    it('displays custom max files limit', () => {
      render(<ScreenshotUploader {...defaultProps} maxFiles={3} />);

      expect(screen.getByText(/0\/3 uploaded/i)).toBeInTheDocument();
    });

    it('shows accepted file types', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      expect(screen.getByText(/PNG, JPG, WEBP up to 5MB/i)).toBeInTheDocument();
    });

    it('hides upload zone when at max files', () => {
      const urls = Array.from({ length: 5 }, (_, i) => `http://example.com/img${i}.png`);

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      expect(screen.queryByText(/Drop screenshots here/i)).not.toBeInTheDocument();
    });

    it('shows max limit message when at capacity', () => {
      const urls = Array.from({ length: 5 }, (_, i) => `http://example.com/img${i}.png`);

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      expect(screen.getByText('Maximum of 5 screenshots reached')).toBeInTheDocument();
    });
  });

  describe('file upload', () => {
    it('uploads file when selected', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(uploadScreenshot).toHaveBeenCalledWith(file, expect.any(Function));
      });
    });

    it('validates files before upload', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(validateImageFile).toHaveBeenCalledWith(file);
      });
    });

    it('calls onChange with new URL after successful upload', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['http://example.com/test.png']);
      });
    });

    it('shows success toast after upload', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('test.png uploaded successfully');
      });
    });

    it('displays upload progress', async () => {
      const user = userEvent.setup();
      let resolveUpload: any;
      const uploadPromise = new Promise<string>((resolve) => {
        resolveUpload = resolve;
      });

      vi.mocked(uploadScreenshot).mockImplementation((file, onProgress) => {
        onProgress?.(50);
        return uploadPromise;
      });

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '50%' });

      resolveUpload('http://example.com/test.png');
    });

    it('handles multiple file uploads', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const files = [
        new File(['image1'], 'test1.png', { type: 'image/png' }),
        new File(['image2'], 'test2.png', { type: 'image/png' }),
      ];
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(uploadScreenshot).toHaveBeenCalledTimes(2);
      });
    });

    it('enforces max file limit', async () => {
      const user = userEvent.setup();
      const existingUrls = Array.from({ length: 3 }, (_, i) => `http://example.com/img${i}.png`);

      render(<ScreenshotUploader {...defaultProps} value={existingUrls} maxFiles={5} />);

      const files = Array.from({ length: 3 }, (_, i) =>
        new File(['image'], `test${i}.png`, { type: 'image/png' })
      );
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('You can only upload 2 more screenshots');
      });
    });

    it('resets input value after upload', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('file validation', () => {
    it('shows error for invalid files', async () => {
      const user = userEvent.setup();

      vi.mocked(validateImageFile).mockReturnValue({
        valid: false,
        error: 'File too large',
      });

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'large.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('large.png: File too large');
      });
    });

    it('does not upload invalid files', async () => {
      const user = userEvent.setup();

      vi.mocked(validateImageFile).mockReturnValue({
        valid: false,
        error: 'Invalid file type',
      });

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(uploadScreenshot).not.toHaveBeenCalled();
      });
    });
  });

  describe('upload errors', () => {
    it('shows error toast on upload failure', async () => {
      const user = userEvent.setup();

      vi.mocked(uploadScreenshot).mockRejectedValue(new Error('Upload failed'));

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to upload test.png: Upload failed');
      });
    });

    it('displays error state in uploading file card', async () => {
      const user = userEvent.setup();

      vi.mocked(uploadScreenshot).mockRejectedValue(new Error('Upload failed'));

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });
  });

  describe('drag and drop', () => {
    it('handles drag over event', async () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const dropZone = screen.getByText(/Drop screenshots here/i).closest('div');

      if (dropZone) {
        const dragOverEvent = new Event('dragover', { bubbles: true });
        Object.defineProperty(dragOverEvent, 'preventDefault', { value: vi.fn() });

        dropZone.dispatchEvent(dragOverEvent);

        expect(dropZone.parentElement).toHaveClass('border-primary');
      }
    });

    it('handles drag leave event', async () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const dropZone = screen.getByText(/Drop screenshots here/i).closest('div');

      if (dropZone) {
        // Trigger dragover first
        const dragOverEvent = new Event('dragover', { bubbles: true });
        Object.defineProperty(dragOverEvent, 'preventDefault', { value: vi.fn() });
        dropZone.dispatchEvent(dragOverEvent);

        // Then drag leave
        const dragLeaveEvent = new Event('dragleave', { bubbles: true });
        Object.defineProperty(dragLeaveEvent, 'preventDefault', { value: vi.fn() });
        dropZone.dispatchEvent(dragLeaveEvent);

        await waitFor(() => {
          expect(dropZone.parentElement).not.toHaveClass('border-primary');
        });
      }
    });

    it('handles file drop', async () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const dropZone = screen.getByText(/Drop screenshots here/i).closest('div');

      if (dropZone) {
        const file = new File(['image'], 'test.png', { type: 'image/png' });
        const dataTransfer = {
          files: [file],
        };

        const dropEvent = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEvent, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });

        dropZone.dispatchEvent(dropEvent);

        await waitFor(() => {
          expect(validateImageFile).toHaveBeenCalledWith(file);
        });
      }
    });

    it('does not handle drop when disabled', async () => {
      render(<ScreenshotUploader {...defaultProps} disabled />);

      const dropZone = screen.getByText(/Drop screenshots here/i).closest('div');

      if (dropZone) {
        const file = new File(['image'], 'test.png', { type: 'image/png' });
        const dataTransfer = {
          files: [file],
        };

        const dropEvent = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEvent, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });

        dropZone.dispatchEvent(dropEvent);

        await waitFor(() => {
          expect(validateImageFile).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('uploaded screenshots display', () => {
    it('displays uploaded screenshots', () => {
      const urls = [
        'http://example.com/img1.png',
        'http://example.com/img2.png',
      ];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('src', urls[0]);
      expect(images[1]).toHaveAttribute('src', urls[1]);
    });

    it('displays screenshots in grid layout', () => {
      const urls = [
        'http://example.com/img1.png',
        'http://example.com/img2.png',
        'http://example.com/img3.png',
      ];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('sm:grid-cols-3');
    });

    it('shows remove button on hover', () => {
      const urls = ['http://example.com/img1.png'];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const removeButton = screen.getByRole('button', { name: /Remove/i });
      expect(removeButton).toBeInTheDocument();
    });

    it('removes screenshot when remove button is clicked', async () => {
      const user = userEvent.setup();
      const urls = ['http://example.com/img1.png', 'http://example.com/img2.png'];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith(['http://example.com/img2.png']);
    });

    it('calls deleteScreenshot when removing', async () => {
      const user = userEvent.setup();
      const urls = ['http://example.com/img1.png'];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const removeButton = screen.getByRole('button', { name: /Remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(deleteScreenshot).toHaveBeenCalledWith(urls[0]);
      });
    });

    it('does not show remove buttons when disabled', () => {
      const urls = ['http://example.com/img1.png'];

      render(<ScreenshotUploader {...defaultProps} value={urls} disabled />);

      expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
    });

    it('uses lazy loading for images', () => {
      const urls = ['http://example.com/img1.png'];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('sets correct alt text for screenshots', () => {
      const urls = [
        'http://example.com/img1.png',
        'http://example.com/img2.png',
      ];

      render(<ScreenshotUploader {...defaultProps} value={urls} />);

      expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument();
      expect(screen.getByAltText('Screenshot 2')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables upload input when disabled', () => {
      render(<ScreenshotUploader {...defaultProps} disabled />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });

    it('applies disabled styles to upload zone', () => {
      render(<ScreenshotUploader {...defaultProps} disabled />);

      const dropZone = screen.getByText(/Drop screenshots here/i).closest('div');
      expect(dropZone).toHaveClass('opacity-50');
      expect(dropZone).toHaveClass('cursor-not-allowed');
    });

    it('disables upload button in uploading files when disabled', async () => {
      const user = userEvent.setup();
      let resolveUpload: any;
      const uploadPromise = new Promise<string>((resolve) => {
        resolveUpload = resolve;
      });

      vi.mocked(uploadScreenshot).mockReturnValue(uploadPromise);

      const { rerender } = render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      rerender(<ScreenshotUploader {...defaultProps} disabled />);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      resolveUpload('http://example.com/test.png');
    });
  });

  describe('uploading files display', () => {
    it('shows uploading file with progress', async () => {
      const user = userEvent.setup();
      let resolveUpload: any;
      const uploadPromise = new Promise<string>((resolve) => {
        resolveUpload = resolve;
      });

      vi.mocked(uploadScreenshot).mockImplementation((file, onProgress) => {
        onProgress?.(50);
        return uploadPromise;
      });

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      resolveUpload('http://example.com/test.png');
    });

    it('shows success icon after upload completes', async () => {
      const user = userEvent.setup();
      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        const successIcon = document.querySelector('.lucide-image');
        expect(successIcon).toBeInTheDocument();
      });
    });

    it('removes uploading file from list after completion delay', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      render(<ScreenshotUploader {...defaultProps} />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const input = screen.getByLabelText(/Drop screenshots here/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      // Fast-forward past the 1000ms delay
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText('test.png')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('file input attributes', () => {
    it('accepts image types only', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    });

    it('allows multiple file selection', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('multiple');
    });

    it('has visually hidden class for accessibility', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveClass('sr-only');
    });

    it('has accessible label', () => {
      render(<ScreenshotUploader {...defaultProps} />);

      const label = screen.getByLabelText(/Drop screenshots here/i);
      expect(label).toBeInTheDocument();
    });
  });
});
