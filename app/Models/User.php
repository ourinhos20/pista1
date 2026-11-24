<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'active',
    ];

    public const ROLES = [
        'master' => 'Master (sócio)',
        'balcao' => 'Balcão',
        'mecanico' => 'Mecânico',
    ];

    public function isMaster(): bool
    {
        return $this->role === 'master';
    }

    public function isMechanic(): bool
    {
        return $this->role === 'mecanico';
    }

    /** Pode ver CPF, telefone, endereço e valores. */
    public function canSeeSensitive(): bool
    {
        return in_array($this->role, ['master', 'balcao'], true);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }
}
