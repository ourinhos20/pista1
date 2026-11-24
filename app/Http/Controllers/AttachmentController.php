<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\ServiceOrder;
use App\Support\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/** Fotos da OS: mecânico e balcão enviam; arquivos só saem por rota autenticada. */
class AttachmentController extends Controller
{
    public const MAX_PER_OS = 40;

    public function store(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        ServiceOrderController::guard($os, $user);

        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:10'],
            'photos.*' => ['file', 'image', 'max:15360'], // até 15 MB antes de reduzir
            'caption' => ['nullable', 'string', 'max:120'],
        ], [
            'photos.required' => 'Escolha pelo menos uma foto.',
            'photos.*.image' => 'Envie apenas fotos (JPG ou PNG).',
            'photos.*.max' => 'Cada foto pode ter no máximo 15 MB.',
        ]);

        $files = $request->file('photos');
        if ($os->attachments()->count() + count($files) > self::MAX_PER_OS) {
            return back()->with('error', 'Limite de '.self::MAX_PER_OS.' fotos por OS.');
        }

        foreach ($files as $file) {
            $os->attachments()->create([
                ...ImageStore::store($file),
                'caption' => $request->input('caption'),
                'uploaded_by' => $user->id,
            ]);
        }
        $os->logEvent($user, count($files) === 1 ? 'Foto anexada' : count($files).' fotos anexadas');

        return back()->with('success', count($files) === 1 ? 'Foto anexada.' : count($files).' fotos anexadas.');
    }

    public function update(Request $request, ServiceOrder $os, Attachment $attachment): RedirectResponse
    {
        abort_unless($attachment->service_order_id === $os->id, 404);
        ServiceOrderController::guard($os, $request->user());
        $attachment->update($request->validate([
            'caption' => ['nullable', 'string', 'max:120'],
            'show_to_client' => ['sometimes', 'boolean'],
        ]));

        return back();
    }

    public function destroy(Request $request, ServiceOrder $os, Attachment $attachment): RedirectResponse
    {
        abort_unless($attachment->service_order_id === $os->id, 404);
        $user = $request->user();
        // mecânico só apaga a foto que ele mesmo tirou
        abort_if(! $user->canSeeSensitive() && $attachment->uploaded_by !== $user->id, 403, 'Só quem tirou a foto pode apagar.');

        $attachment->delete();

        return back()->with('success', 'Foto excluída.');
    }

    /** Entrega a foto para quem está logado (mecânico só vê fotos de OS). */
    public function show(Request $request, Attachment $attachment): Response
    {
        $user = $request->user();
        if ($attachment->service_order_id) {
            ServiceOrderController::guard($attachment->serviceOrder, $user);
        } else {
            abort_unless($user->canSeeSensitive(), 403);
        }

        return $this->file($attachment, $request->boolean('mini'));
    }

    /** Foto exibida na página pública do orçamento (precisa do link secreto da OS). */
    public function showPublic(Request $request, string $token, Attachment $attachment): Response
    {
        $os = ServiceOrder::where('public_token', $token)->firstOrFail();
        abort_unless($attachment->service_order_id === $os->id && $attachment->show_to_client, 404);

        return $this->file($attachment, $request->boolean('mini'));
    }

    private function file(Attachment $a, bool $mini): Response
    {
        $path = $mini ? $a->thumb_path : $a->path;
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
