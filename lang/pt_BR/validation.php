<?php

// Mensagens de validação em português (somente as regras usadas no sistema).
return [
    'required' => 'Preencha o campo :attribute.',
    'required_without' => 'Preencha o campo :attribute.',
    'email' => 'Informe um e-mail válido.',
    'unique' => 'Este :attribute já está em uso.',
    'exists' => 'O :attribute selecionado não existe.',
    'integer' => 'O campo :attribute deve ser um número inteiro.',
    'numeric' => 'O campo :attribute deve ser um número.',
    'boolean' => 'O campo :attribute é inválido.',
    'date' => 'Informe uma data válida.',
    'in' => 'O valor de :attribute é inválido.',
    'array' => 'O campo :attribute é inválido.',
    'string' => 'O campo :attribute é inválido.',
    'between' => ['numeric' => 'O campo :attribute deve estar entre :min e :max.'],
    'min' => [
        'numeric' => 'O campo :attribute deve ser no mínimo :min.',
        'string' => 'O campo :attribute deve ter pelo menos :min caracteres.',
    ],
    'max' => [
        'numeric' => 'O campo :attribute deve ser no máximo :max.',
        'string' => 'O campo :attribute deve ter no máximo :max caracteres.',
        'array' => 'Itens demais em :attribute.',
    ],
    'password' => [
        'min' => 'A senha deve ter pelo menos :min caracteres.',
    ],
    'confirmed' => 'A confirmação de :attribute não confere.',
    'current_password' => 'Senha atual incorreta.',

    'attributes' => [
        'name' => 'nome',
        'email' => 'e-mail',
        'password' => 'senha',
        'phone' => 'telefone',
        'document' => 'CPF/CNPJ',
        'plate' => 'placa',
        'km_in' => 'km',
        'km' => 'km',
        'description' => 'descrição',
        'quantity' => 'quantidade',
        'unit_price' => 'valor',
        'role' => 'perfil',
        'client.name' => 'nome do cliente',
        'mechanic_id' => 'mecânico',
    ],
];
