<?php

namespace App\Modules\Auth\DTOs;

use Illuminate\Support\Str;

final readonly class NewTenantData
{
    public function __construct(
        public string $name,
        public string $document,
        public string $email,
        public ?string $phone,
        public string $domain,
    ) {}

    /**
     * Conta pessoal do NutriFlow: o tenant é a própria pessoa; o domínio é só um identificador interno.
     */
    public static function personal(string $name, string $email): self
    {
        return new self(
            name: $name,
            document: '',
            email: $email,
            phone: null,
            domain: Str::lower((string) Str::uuid()).'.contas.nutriflow.invalid',
        );
    }

    /**
     * @param  array{name: string, document: string, email: string, phone?: ?string, domain: string}  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            document: $data['document'],
            email: $data['email'],
            phone: $data['phone'] ?? null,
            domain: $data['domain'],
        );
    }

    /**
     * @return array{name: string, document: string, email: string, phone: ?string, domain: string}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'document' => $this->document,
            'email' => $this->email,
            'phone' => $this->phone,
            'domain' => $this->domain,
        ];
    }
}
