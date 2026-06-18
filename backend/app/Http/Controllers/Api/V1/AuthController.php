<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\DeviceTokenRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::with(['role', 'department'])
            ->where('email', $request->string('email'))
            ->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau kata sandi salah.'],
            ])->status(401);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda tidak aktif. Hubungi administrator.'],
            ])->status(401);
        }

        $token = $user->createToken($request->string('device_name'))->plainTextToken;

        return $this->respondSuccess([
            'token' => $token,
            'user' => new UserResource($user),
        ], 'Login berhasil.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->respondSuccess(null, 'Logout berhasil.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role', 'department.manager']);

        return $this->respondSuccess(new UserResource($user), 'OK');
    }

    public function deviceToken(DeviceTokenRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->fcm_token = $request->string('fcm_token');
        $user->save();

        return $this->respondSuccess(null, 'Device token tersimpan.');
    }
}
