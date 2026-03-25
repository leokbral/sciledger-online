<script lang="ts">
	interface Props {
		file: File;
		onApply: (blob: Blob) => Promise<void>;
		onCancel: () => void;
	}

	let { file, onApply, onCancel }: Props = $props();

	// Crop state
	let cropSource = $state('');
	let cropImageElement = $state<HTMLImageElement | null>(null);
	let cropNaturalWidth = $state(0);
	let cropNaturalHeight = $state(0);
	let cropScale = $state(1);
	let cropX = $state(0);
	let cropY = $state(0);
	let isDraggingCrop = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragOriginX = $state(0);
	let dragOriginY = $state(0);
	let isUploading = $state(false);
	let errorMessage = $state('');

	const cropViewportSize = 256;
	const outputImageSize = 512;

	// Initialize crop modal
	$effect(() => {
		if (file) {
			initializeCrop();
		}
	});

	async function initializeCrop() {
		const objectUrl = URL.createObjectURL(file);

		try {
			const image = new Image();
			image.src = objectUrl;

			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error('Failed to load selected image.'));
			});

			cropNaturalWidth = image.naturalWidth;
			cropNaturalHeight = image.naturalHeight;
			cropImageElement = image;
			cropSource = objectUrl;

			cropScale = Math.max(cropViewportSize / cropNaturalWidth, cropViewportSize / cropNaturalHeight);
			const initialWidth = cropNaturalWidth * cropScale;
			const initialHeight = cropNaturalHeight * cropScale;
			cropX = (cropViewportSize - initialWidth) / 2;
			cropY = (cropViewportSize - initialHeight) / 2;
			clampCropPosition(cropX, cropY);
		} catch (error) {
			URL.revokeObjectURL(objectUrl);
			errorMessage = 'Could not load the image.';
		}
	}

	function clampCropPosition(nextX: number, nextY: number) {
		const scaledWidth = cropNaturalWidth * cropScale;
		const scaledHeight = cropNaturalHeight * cropScale;

		const minX = Math.min(0, cropViewportSize - scaledWidth);
		const maxX = 0;
		const minY = Math.min(0, cropViewportSize - scaledHeight);
		const maxY = 0;

		cropX = Math.max(minX, Math.min(maxX, nextX));
		cropY = Math.max(minY, Math.min(maxY, nextY));
	}

	function startCropDrag(event: PointerEvent) {
		isDraggingCrop = true;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragOriginX = cropX;
		dragOriginY = cropY;
	}

	function onCropDrag(event: PointerEvent) {
		if (!isDraggingCrop) {
			return;
		}

		const deltaX = event.clientX - dragStartX;
		const deltaY = event.clientY - dragStartY;
		clampCropPosition(dragOriginX + deltaX, dragOriginY + deltaY);
	}

	function stopCropDrag() {
		isDraggingCrop = false;
	}

	async function applyCropAndUpload() {
		if (!cropImageElement || isUploading) {
			return;
		}

		isUploading = true;
		errorMessage = '';

		try {
			const canvas = document.createElement('canvas');
			canvas.width = outputImageSize;
			canvas.height = outputImageSize;
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				throw new Error('Failed to create image context.');
			}

			ctx.clearRect(0, 0, outputImageSize, outputImageSize);
			ctx.save();
			ctx.beginPath();
			ctx.arc(outputImageSize / 2, outputImageSize / 2, outputImageSize / 2, 0, Math.PI * 2);
			ctx.closePath();
			ctx.clip();

			const ratio = outputImageSize / cropViewportSize;
			ctx.drawImage(
				cropImageElement,
				cropX * ratio,
				cropY * ratio,
				cropNaturalWidth * cropScale * ratio,
				cropNaturalHeight * cropScale * ratio
			);
			ctx.restore();

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((value) => resolve(value), 'image/png', 0.95);
			});

			if (!blob) {
				throw new Error('Failed to generate cropped image.');
			}

			await onApply(blob);
			cleanup();
		} catch (error) {
			console.error('Error cropping and uploading profile picture:', error);
			errorMessage = 'Could not crop/upload the photo. Try again.';
		} finally {
			isUploading = false;
		}
	}

	function cleanup() {
		if (cropSource) {
			URL.revokeObjectURL(cropSource);
		}
		cropImageElement = null;
		cropSource = '';
		onCancel();
	}

	function handleCancel() {
		cleanup();
	}
</script>

<!-- Image Cropper Modal -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onpointermove={onCropDrag} onpointerup={stopCropDrag} onpointercancel={stopCropDrag}>
	<div class="bg-white rounded-xl shadow-2xl p-6 w-[min(92vw,36rem)]">
		<h3 class="text-xl font-semibold">Crop profile picture</h3>
		<p class="text-sm text-gray-600 mt-1">Drag the image to position the circular crop.</p>

		{#if errorMessage}
			<div class="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
				{errorMessage}
			</div>
		{/if}

		<div class="mt-5 flex justify-center">
			<div
				class="relative rounded-full overflow-hidden border-4 border-gray-200 cursor-grab active:cursor-grabbing select-none"
				style={`width:${cropViewportSize}px;height:${cropViewportSize}px;`}
				onpointerdown={startCropDrag}
			>
				{#if cropSource}
					<img
						src={cropSource}
					alt="Crop preview"
						class="absolute max-w-none pointer-events-none"
						draggable="false"
						style={`left:${cropX}px;top:${cropY}px;width:${cropNaturalWidth * cropScale}px;height:${cropNaturalHeight * cropScale}px;`}
					/>
				{/if}
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<button 
				class="bg-gray-500 text-white px-4 py-2 rounded-md" 
				onclick={handleCancel} 
				disabled={isUploading}
			>
				Cancel
			</button>
			<button 
				class="bg-green-600 text-white px-4 py-2 rounded-md" 
				onclick={applyCropAndUpload} 
				disabled={isUploading}
			>
				{isUploading ? 'Uploading...' : 'Apply crop'}
			</button>
		</div>
	</div>
</div>
