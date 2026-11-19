<?php

namespace App\Modules\Account\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetCodeNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code, private readonly int $minutes) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Seu código para redefinir a senha — '.config('app.name'))
            ->greeting('Olá!')
            ->line('Recebemos um pedido para redefinir a senha da sua conta.')
            ->line("Seu código de verificação é: **{$this->code}**")
            ->line("Ele expira em {$this->minutes} minutos e só pode ser usado uma vez.")
            ->line('Se não foi você, ignore este e-mail: sua senha continua a mesma.')
            ->salutation('Equipe '.config('app.name'));
    }
}
