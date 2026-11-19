<?php

namespace App\Modules\Tracking\Enums;

enum MeasurementType: string
{
    case WAIST = 'waist';
    case HIP = 'hip';
    case ARM = 'arm';
    case THIGH = 'thigh';
    case CHEST = 'chest';
    case BODY_FAT = 'body_fat';

    public function label(): string
    {
        return match ($this) {
            self::WAIST => 'Cintura',
            self::HIP => 'Quadril',
            self::ARM => 'Braço',
            self::THIGH => 'Coxa',
            self::CHEST => 'Peito',
            self::BODY_FAT => 'Gordura corporal',
        };
    }

    public function unit(): string
    {
        return $this === self::BODY_FAT ? '%' : 'cm';
    }
}
